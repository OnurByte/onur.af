import { randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { readKey } from 'openpgp';
import {
  canonicalLogPublication,
  verifyLogPublicationChain,
  verifyLogPublications,
  type LogPublicationEntry,
  type LogPublicationManifest,
} from '../src/portfolio/log-publications';
import { logEntries } from '../src/portfolio/log';
import {
  assertAllLogRevisionsSigned,
  verifyLogSignatures,
} from '../src/portfolio/log-signatures';
import { verifyBytes } from '../src/portfolio/proofs';
import { signXmlWithGpg } from '../src/portfolio/rss-signing';
import signatureArtifacts from '../src/content/log-signatures.json' with { type: 'json' };

const storeFile = fileURLToPath(
  new URL('../src/content/log-publications.json', import.meta.url),
);
const publicKeyFile = new URL('../public/pgp.asc', import.meta.url);
const [command, ...extra] = process.argv.slice(2);

async function readStore(): Promise<unknown> {
  return JSON.parse(await readFile(storeFile, 'utf8'));
}

async function writeStore(input: unknown) {
  const temporary = `${storeFile}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(input, null, 2)}\n`, {
      flag: 'wx',
    });
    await rename(temporary, storeFile);
  } finally {
    await rm(temporary, { force: true });
  }
}

function liveEntries(
  signatures: Awaited<ReturnType<typeof verifyLogSignatures>>,
): LogPublicationEntry[] {
  return logEntries
    .flatMap((entry) =>
      entry.revisions.map((revision) => {
        const id = `${entry.id}-v${revision.version}`;
        const signature = signatures[id];
        if (!signature)
          throw new Error(`Missing verified Log signature for ${id}`);
        return {
          id: entry.id,
          version: revision.version,
          sha256: signature.sha256,
        };
      }),
    )
    .sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : a.version - b.version,
    );
}

function sameEntries(
  a: readonly LogPublicationEntry[],
  b: readonly LogPublicationEntry[],
) {
  return (
    a.length === b.length &&
    a.every(
      (entry, index) =>
        entry.id === b[index]?.id &&
        entry.version === b[index]?.version &&
        entry.sha256 === b[index]?.sha256,
    )
  );
}

async function main() {
  if (extra.length || (command !== 'append' && command !== '--check'))
    throw new Error('Usage: bun scripts/log-publications.ts append | --check');

  const publicKey = await readFile(publicKeyFile, 'utf8');
  const fingerprint = (await readKey({ armoredKey: publicKey }))
    .getFingerprint()
    .toUpperCase();
  const signatures = await verifyLogSignatures(
    logEntries,
    signatureArtifacts,
    publicKey,
  );
  assertAllLogRevisionsSigned(logEntries, signatures);
  const currentEntries = liveEntries(signatures);
  const store = await readStore();

  if (command === '--check') {
    const verified = await verifyLogPublications(
      logEntries,
      signatures,
      store,
      publicKey,
    );
    if (!verified.latest)
      throw new Error('No signed Log publication edition has been published');
    console.log(
      `${verified.editions.length} signed Log publication edition(s) verified.`,
    );
    return;
  }

  const chain = await verifyLogPublicationChain(store, publicKey);
  const latest = chain.latest;
  if (latest && sameEntries(latest.manifest.entries, currentEntries)) {
    console.log(
      `Log publication edition ${latest.manifest.sequence} already covers the current Log set.`,
    );
    return;
  }

  if (latest) {
    const current = new Map(
      currentEntries.map((entry) => [
        `${entry.id}-v${entry.version}`,
        entry.sha256,
      ]),
    );
    for (const entry of latest.manifest.entries) {
      if (current.get(`${entry.id}-v${entry.version}`) !== entry.sha256)
        throw new Error(
          `Cannot publish a Log edition that rewrites or removes ${entry.id}-v${entry.version}`,
        );
    }
  }

  const manifest: LogPublicationManifest = {
    format: 1,
    sequence: (latest?.manifest.sequence ?? 0) + 1,
    previousSha256: latest?.sha256 ?? null,
    entries: currentEntries,
  };
  const bytes = canonicalLogPublication(manifest);
  const signature = await signXmlWithGpg(bytes, fingerprint);
  await verifyBytes(bytes, signature, publicKey);
  const next = {
    editions: [
      ...chain.editions.map((edition) => ({
        manifest: edition.bytes,
        signature: edition.signature,
      })),
      { manifest: bytes, signature },
    ],
  };
  await verifyLogPublications(logEntries, signatures, next, publicKey);
  await writeStore(next);
  console.log(
    `Signed Log publication edition ${manifest.sequence} with ${manifest.entries.length} revision(s).`,
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Log publication failed',
  );
  process.exitCode = 1;
});

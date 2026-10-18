import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ots from 'opentimestamps';
import { readJsonFile, writeJsonFile } from '../src/server/json-file';
import { logEntries } from '../src/portfolio/log';
import { verifyLogSignatures } from '../src/portfolio/log-signatures';
import { verifyLogPublicationChain } from '../src/portfolio/log-publications';
import {
  createLogProofStatement,
  proofFiles,
  verifyLogProofStore,
} from '../src/portfolio/log-proof-store';
import {
  proofSignatureTimestamp,
  verifyLogProof,
} from '../src/portfolio/log-proof';
import { signXmlWithGpg } from '../src/portfolio/rss-signing';
import { assertPublicationReadable } from '../src/portfolio/publication-transaction';
import { loadConfiguredKeyTrust } from '../src/portfolio/key-history';

await assertPublicationReadable(process.cwd());
const [command, id, ...extra] = process.argv.slice(2);
if (
  extra.length ||
  !['--check', 'prepare', 'upgrade'].includes(command ?? '') ||
  (command === '--check' && id) ||
  (id && !logEntries.some((entry) => entry.id === id))
)
  throw new Error(
    'Usage: bun scripts/log-proofs.ts --check | prepare [id] | upgrade [id]',
  );
const publicDirectory = resolve('public');
const root = await readFile('public/pgp.asc', 'utf8');
const history = await readJsonFile('src/content/key-history.json');
const trust = await loadConfiguredKeyTrust(root, history);
const publications = await verifyLogPublicationChain(
  await readJsonFile('src/content/log-publications.json'),
  trust,
);
const publicationSequence = (publications.latest?.manifest.sequence ?? 0) + 1;
const sequenceByRevision = Object.fromEntries(
  publications.editions
    .flatMap((edition) =>
      edition.manifest.entries.map(
        (item) =>
          [`${item.id}-v${item.version}`, edition.manifest.sequence] as const,
      ),
    )
    .reverse(),
);
const signatureInput = await readJsonFile('src/content/log-signatures.json');
const signatures = await verifyLogSignatures(
  logEntries,
  signatureInput,
  { ...trust, sequence: publicationSequence },
  sequenceByRevision,
);
const store = await verifyLogProofStore(
  logEntries,
  await readJsonFile('src/content/log-proofs.json'),
  signatures,
  trust,
  publicDirectory,
  command === '--check',
  sequenceByRevision,
);
if (command === '--check') {
  for (const edition of publications.editions)
    for (const item of edition.manifest.entries) {
      const bound = (item as typeof item & { proofSha256?: string })
        .proofSha256;
      if (bound) {
        const artifact = store[`${item.id}-v${item.version}`];
        const { proofDigest } = await import('../src/portfolio/log-proof');
        if (!artifact || proofDigest(artifact.statement) !== bound)
          throw new Error('Publication-bound proof is missing or changed');
      }
    }
  console.log(
    `${Object.keys(store).length} v2 proof(s) verified; ${Object.keys(signatures).length - Object.keys(store).length} legacy revision(s) retain original evidence.`,
  );
} else {
  for (const entry of logEntries.filter((entry) => !id || entry.id === id))
    for (const revision of entry.revisions) {
      const key = `${entry.id}-v${revision.version}`;
      const markdownSignature = signatures[key];
      if (!markdownSignature)
        throw new Error(`Sign Markdown before preparing its proof: ${key}`);
      let artifact = store[key];
      if (!artifact && command === 'prepare') {
        // A new statement for an old revision keeps the revision's original signing key.
        const statementSequence =
          sequenceByRevision[key] ?? publicationSequence;
        const statement = await createLogProofStatement(
          entry,
          revision.version,
          markdownSignature.signature,
          markdownSignature.fingerprint,
          statementSequence,
          publicDirectory,
        );
        const signature = await signXmlWithGpg(
          statement,
          markdownSignature.fingerprint,
        );
        artifact = { statement, signature };
      }
      if (!artifact) continue;
      if (command === 'prepare' && artifact.timestamp) continue;
      const detached = artifact.timestamp
        ? ots.DetachedTimestampFile.deserialize(
            Buffer.from(artifact.timestamp, 'base64'),
          )
        : proofSignatureTimestamp(artifact.signature);
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          command === 'upgrade' ? ots.upgrade(detached) : ots.stamp(detached),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new Error('Proof timestamp calendar timed out')),
              30000,
            );
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
      artifact = {
        ...artifact,
        timestamp: Buffer.from(detached.serializeToBytes()).toString('base64'),
      };
      await verifyLogProof(
        artifact,
        await proofFiles(
          entry,
          revision.version,
          artifact,
          markdownSignature.signature,
          publicDirectory,
        ),
        trust,
        { id: entry.id, version: revision.version },
      );
      store[key] = artifact;
      await writeJsonFile('src/content/log-proofs.json', store);
      console.log(
        `Stored ${key} proof (signature timestamp; confirmation not implied).`,
      );
    }
}

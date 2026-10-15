import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readKey } from 'openpgp';
import { rssXml } from '../src/portfolio/feeds';
import { rssEntries } from '../src/portfolio/rss-entries';
import {
  rssDigest,
  rssSignatureSchema,
  verifyRssSignature,
} from '../src/portfolio/rss-signatures';
import { validSiteUrl } from '../src/portfolio/seo';
import { signXmlWithGpg } from '../src/portfolio/rss-signing';

const artifactPath = fileURLToPath(
  new URL('../src/content/rss-signature.json', import.meta.url),
);
const keyPath = fileURLToPath(new URL('../public/pgp.asc', import.meta.url));

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check'))
    throw new Error('Usage: bun scripts/rss-sign.ts [--check]');
  const checkOnly = args[0] === '--check';
  const artifact: unknown = JSON.parse(await readFile(artifactPath, 'utf8'));
  if (checkOnly && artifact === null) {
    console.log('RSS is unsigned. No signature will be advertised.');
    return;
  }
  const configuredOrigin = process.env.SITE_URL;
  const origin =
    checkOnly && !configuredOrigin
      ? rssSignatureSchema.parse(artifact).origin
      : validSiteUrl(configuredOrigin);
  if (!origin)
    throw new Error(
      'Set SITE_URL to the canonical public origin before signing RSS',
    );
  const xml = rssXml(origin, rssEntries);
  if (!xml) throw new Error('Unable to generate RSS XML');
  const publicKey = await readFile(keyPath, 'utf8');
  if (checkOnly) {
    const parsed = rssSignatureSchema.parse(artifact);
    if (parsed.origin !== origin)
      throw new Error('SITE_URL changed since RSS signing');
    await verifyRssSignature(xml, parsed, publicKey);
    console.log(
      'RSS signature verified against public/pgp.asc and current feed bytes.',
    );
    return;
  }
  const fingerprint = (await readKey({ armoredKey: publicKey }))
    .getFingerprint()
    .toUpperCase();
  const signature = await signXmlWithGpg(xml, fingerprint);
  const next = { version: 1, origin, sha256: rssDigest(xml), signature };
  await verifyRssSignature(xml, next, publicKey);
  const temporary = `${artifactPath}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, {
      flag: 'wx',
    });
    await rename(temporary, artifactPath);
  } finally {
    await rm(temporary, { force: true });
  }
  console.log(
    'Signed exact RSS XML. Signature artifact updated; run bun run build before publishing.',
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'RSS signing failed');
  process.exitCode = 1;
});

import { loadSiteTrust, loadPublicationChain } from './trust';
import { runCli } from './cli';
import { readJsonFile, writeJsonFile } from '../src/server/json-file';
import { fileURLToPath } from 'node:url';
import { readKey } from 'openpgp';
import { rssXml } from '../src/portfolio/feeds';
import { rssEntries } from '../src/portfolio/rss-entries';
import {
  rssDigest,
  rssSignatureSchema,
  canonicalRssAuthorization,
  verifyRssSignature,
} from '../src/portfolio/rss-signatures';
import { validSiteUrl } from '../src/portfolio/seo';
import { signXmlWithGpg } from '../src/portfolio/rss-signing';
import { resolveTrustedCertificate } from '../src/portfolio/key-history';

const artifactPath = fileURLToPath(
  new URL('../src/content/rss-signature.json', import.meta.url),
);

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check'))
    throw new Error('Usage: bun scripts/rss-sign.ts [--check]');
  const checkOnly = args[0] === '--check';
  const artifact: unknown = await readJsonFile(artifactPath);
  if (checkOnly && artifact === null) {
    console.log('RSS is unsigned. No signature will be advertised.');
    return;
  }
  const configuredOrigin = process.env['SITE_URL'];
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
  const trust = await loadSiteTrust();
  const publications = await loadPublicationChain(trust);
  if (checkOnly) {
    const parsed = rssSignatureSchema.parse(artifact);
    if (parsed.origin !== origin)
      throw new Error('SITE_URL changed since RSS signing');
    await verifyRssSignature(xml, parsed, trust);
    console.log(
      'RSS signature verified against public/pgp.asc and current feed bytes.',
    );
    return;
  }
  const publicationSequence = publications.latest?.manifest.sequence ?? 1;
  const signingCertificate = (
    await resolveTrustedCertificate({ ...trust, sequence: publicationSequence })
  ).certificate;
  const fingerprint = (await readKey({ armoredKey: signingCertificate }))
    .getFingerprint()
    .toUpperCase();
  const signature = await signXmlWithGpg(xml, fingerprint);
  const authorization = {
    domain: 'onurbyte-rss-signature-authorization-v1' as const,
    publicationSequence,
    fingerprint,
    xmlSha256: rssDigest(xml),
    signatureSha256: rssDigest(signature),
  };
  const authorizationSignature = await signXmlWithGpg(
    canonicalRssAuthorization(authorization),
    fingerprint,
  );
  const next = {
    version: 2,
    origin,
    sha256: rssDigest(xml),
    signature,
    authorization: { ...authorization, signature: authorizationSignature },
  };
  await verifyRssSignature(xml, next, trust);
  await writeJsonFile(artifactPath, next);
  console.log(
    'Signed exact RSS XML. Signature artifact updated; run bun run build before publishing.',
  );
}

runCli(main, 'RSS signing failed');

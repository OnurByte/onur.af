import { readJsonFile, writeJsonFile } from '../src/server/json-file';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { readKey } from 'openpgp';
import {
  loadConfiguredKeyTrust,
  resolveTrustedCertificate,
} from '../src/portfolio/key-history';
import { verifyLogPublicationChain } from '../src/portfolio/log-publications';
import {
  logEntries,
  getLogEntryById,
  revisionMarkdown,
} from '../src/portfolio/log';
import {
  digest,
  verifyLogSignatures,
  assertAllLogRevisionsSigned,
  revisionPublicationSequences,
} from '../src/portfolio/log-signatures';
import {
  identityProofs,
  identityStatement,
  canonicalIdentityStatement,
  identityAccounts,
  verifyIdentitySignature,
  verifyIdentityStatement,
  verifyProofs,
  checkAccountProof,
  type IdentityClaim,
} from '../src/portfolio/proofs';
import {
  signXmlWithGpg as signWithGpg,
  clearSignWithGpg,
} from '../src/portfolio/rss-signing';

const file = (name: string) =>
  fileURLToPath(new URL(`../src/content/${name}.json`, import.meta.url));
async function save(name: string, data: unknown) {
  const target = file(name);
  await writeJsonFile(target, data);
}
async function main() {
  const publicKey = await readFile(
    new URL('../public/pgp.asc', import.meta.url),
    'utf8',
  );
  const trust = await loadConfiguredKeyTrust(
    publicKey,
    await readJsonFile(file('key-history')),
  );
  const publications = await verifyLogPublicationChain(
    await readJsonFile(file('log-publications')),
    trust,
  );
  const sequences = revisionPublicationSequences(publications, logEntries);
  const nextPublicationSequence =
    (publications.latest?.manifest.sequence ?? 0) + 1;
  const signingCertificate = (
    await resolveTrustedCertificate({
      ...trust,
      sequence: nextPublicationSequence,
    })
  ).certificate;
  const fingerprint = (await readKey({ armoredKey: signingCertificate }))
    .getFingerprint()
    .toUpperCase();
  const identitySequence = publications.latest?.manifest.sequence ?? 1;
  const identityCertificate = (
    await resolveTrustedCertificate({ ...trust, sequence: identitySequence })
  ).certificate;
  const identityFingerprint = (
    await readKey({ armoredKey: identityCertificate })
  )
    .getFingerprint()
    .toUpperCase();
  const rawArtifacts = await readJsonFile(file('log-signatures'));
  const verifiedLogs = await verifyLogSignatures(
    logEntries,
    rawArtifacts,
    trust,
    sequences,
  );
  const artifacts = Object.fromEntries(
    Object.entries(verifiedLogs).map(([id, { sha256, signature }]) => [
      id,
      { sha256, signature },
    ]),
  );
  const [command, id, value, ...extra] = process.argv.slice(2);
  if (extra.length) throw new Error('Too many arguments');
  if (command === '--check-remote' && !id) {
    const checked = await verifyProofs(identityProofs, trust);
    if (checked.length !== identityProofs.length)
      throw new Error('Remote identity counterpart verification failed');
    console.log(`${checked.length} remote identity counterpart(s) checked.`);
    return;
  }
  if (command === '--check' && !id) {
    assertAllLogRevisionsSigned(logEntries, verifiedLogs);
    const verified = await Promise.all(
      identityProofs.map((proof) => verifyIdentitySignature(proof, trust)),
    );
    if (verified.length !== identityProofs.length)
      throw new Error(
        'Identity proof signature or public counterpart failed verification',
      );
    await verifyIdentityStatement(identityStatement, trust);
    console.log(
      `${verified.length} identity proofs, the account ownership statement, and ${Object.keys(artifacts).length} Log signatures verified.`,
    );
    return;
  }
  if (command === 'identity-statement' && !id) {
    const statement = {
      publishedAt: new Date().toISOString(),
      signedMessage: await clearSignWithGpg(
        canonicalIdentityStatement(identitySequence, identityFingerprint),
        identityFingerprint,
      ),
    };
    await verifyIdentityStatement(statement, trust);
    await save('identity-statement', statement);
    console.log('Signed the X and GitHub account ownership statement.');
    return;
  }
  if (command === 'log' && id) {
    const entry = getLogEntryById(id);
    if (!entry) throw new Error(`Unknown Log entry: ${id}`);
    const version = value ? Number(value) : entry.revisions.at(-1)!.version;
    const body = revisionMarkdown(entry, version);
    const name = `${entry.id}-v${version}`;
    if (artifacts[name]) {
      console.log(`${name} is already signed and verified.`);
      return;
    }
    const signature = await signWithGpg(body, fingerprint);
    const next = { ...artifacts, [name]: { sha256: digest(body), signature } };
    await verifyLogSignatures(logEntries, next, trust, sequences);
    await save('log-signatures', next);
    console.log(`Signed ${name}.`);
    return;
  }
  if (command === 'identity' && (id === 'x' || id === 'github')) {
    const claim: IdentityClaim = {
      id,
      profile: identityAccounts[id].profile,
      ...(value ? { proofUrl: value } : {}),
      publishedAt: new Date().toISOString(),
    };
    if (value && !(await checkAccountProof(claim, identityFingerprint)))
      throw new Error(
        `Publish openpgp4fpr:${identityFingerprint} from the claimed account, then pass that post or Gist URL.`,
      );
    const versionedClaim = {
      ...claim,
      publicationSequence: identitySequence,
      signerFingerprint: identityFingerprint,
    };
    const statement = `onurbyte-identity-proof-v2\npublication-sequence:${identitySequence}\nsigner:${identityFingerprint}\naccount:${claim.profile}\n`;
    const proof = {
      ...versionedClaim,
      signedMessage: await clearSignWithGpg(statement, identityFingerprint),
    };
    await verifyIdentitySignature(proof, trust);
    if ((await verifyProofs([proof], trust)).length !== 1)
      throw new Error('Signed identity proof did not verify');
    await save('identity-proofs', [
      ...identityProofs.filter((proof) => proof.id !== id),
      proof,
    ]);
    console.log(`Signed ${id} identity proof.`);
    return;
  }
  throw new Error(
    'Usage: bun scripts/proofs.ts --check | log <id> [version] | identity-statement | identity <x|github> [proof-url]',
  );
}
main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Proof publishing failed',
  );
  process.exitCode = 1;
});

import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readKey } from 'openpgp';
import {
  logEntries,
  getLogEntryById,
  revisionMarkdown,
} from '../src/portfolio/log';
import {
  digest,
  verifyLogSignatures,
  assertAllLogRevisionsSigned,
} from '../src/portfolio/log-signatures';
import {
  identityProofs,
  identityStatement,
  identityStatementText,
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
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, {
      flag: 'wx',
    });
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
}
async function main() {
  const publicKey = await readFile(
    new URL('../public/pgp.asc', import.meta.url),
    'utf8',
  );
  const fingerprint = (await readKey({ armoredKey: publicKey }))
    .getFingerprint()
    .toUpperCase();
  const artifacts = JSON.parse(await readFile(file('log-signatures'), 'utf8'));
  const verifiedLogs = await verifyLogSignatures(
    logEntries,
    artifacts,
    publicKey,
  );
  const [command, id, value, ...extra] = process.argv.slice(2);
  if (extra.length) throw new Error('Too many arguments');
  if (command === '--check' && !id) {
    assertAllLogRevisionsSigned(logEntries, verifiedLogs);
    const verified = await verifyProofs(identityProofs, publicKey);
    if (verified.length !== identityProofs.length)
      throw new Error(
        'Identity proof signature or public counterpart failed verification',
      );
    await verifyIdentityStatement(identityStatement, publicKey);
    console.log(
      `${verified.length} identity proofs, the account ownership statement, and ${Object.keys(artifacts).length} Log signatures verified.`,
    );
    return;
  }
  if (command === 'identity-statement' && !id) {
    const statement = {
      publishedAt: new Date().toISOString(),
      signedMessage: await clearSignWithGpg(identityStatementText, fingerprint),
    };
    await verifyIdentityStatement(statement, publicKey);
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
    await verifyLogSignatures(logEntries, next, publicKey);
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
    if (value && !(await checkAccountProof(claim, fingerprint)))
      throw new Error(
        `Publish openpgp4fpr:${fingerprint} from the claimed account, then pass that post or Gist URL.`,
      );
    const proof = {
      ...claim,
      signedMessage: await clearSignWithGpg(claim.profile, fingerprint),
    };
    await verifyIdentitySignature(proof, publicKey);
    if ((await verifyProofs([proof], publicKey)).length !== 1)
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

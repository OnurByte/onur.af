import { loadSiteTrust, loadPublicationChain } from './trust';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readKey } from 'openpgp';
import { writeJsonFile } from '../src/server/json-file';
import {
  canonicalAuthority,
  canonicalStatement,
  statementForManifest,
  parseStatement,
  sigsumChecksum,
  transparencyDigest,
  verifyAuthority,
} from '../src/portfolio/transparency/statement';
import {
  evidenceFiles,
  readTransparencyEvidence,
  verifyTransparencyEvidence,
} from '../src/portfolio/transparency/evidence';

const [command, directory, ...args] = process.argv.slice(2);
const options = new Map<string, string>();
let allowNetwork = false;
for (let i = 0; i < args.length; i++) {
  const key = args[i];
  const value = args[i + 1];
  if (!key) throw new Error('Invalid transparency option');
  if (key === '--allow-network') {
    allowNetwork = true;
    continue;
  }
  if (
    ![
      '--sequence',
      '--fingerprint',
      '--submitter',
      '--policy',
      '--policy-sha256',
      '--key',
    ].includes(key) ||
    !value ||
    value.startsWith('--') ||
    options.has(key)
  )
    throw new Error('Invalid transparency option');
  options.set(key, value);
  i++;
}
if (
  !directory ||
  !['prepare', 'verify', 'submit', 'pack', 'expected'].includes(command ?? '')
)
  throw new Error(
    'Usage: bun scripts/transparency.ts prepare|verify|submit|pack|expected DIRECTORY --fingerprint FINGERPRINT [--sequence N --submitter PUBLIC_KEY --policy POLICY | --policy-sha256 SHA256] [--key PRIVATE_KEY --allow-network]',
  );
const required = (name: string) => {
  const value = options.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};
const trust = await loadSiteTrust();
const root = trust.root;
const trustedFingerprint = required('--fingerprint').toUpperCase();
if (
  (await readKey({ armoredKey: root })).getFingerprint().toUpperCase() !==
  trustedFingerprint
)
  throw new Error(
    'Configured root does not match independently trusted fingerprint',
  );
const publications = await loadPublicationChain(trust);
if (command === 'prepare') {
  const sequence = Number(required('--sequence'));
  const edition = publications.editions.find(
    (item) => item.manifest.sequence === sequence,
  );
  if (!edition) throw new Error('Unknown signed publication edition');
  const submitterPublicKey = (
    await readFile(required('--submitter'), 'utf8')
  ).trim();
  const policy = await readFile(required('--policy'), 'utf8');
  const statement = canonicalStatement(
    statementForManifest(edition.bytes, trustedFingerprint),
  );
  const authority = canonicalAuthority({
    format: 'onur.sigsum-authority.v1',
    origin: 'https://onur.af',
    rootFingerprint: trustedFingerprint,
    submitterPublicKey,
    validFromSequence: sequence,
    validThroughSequence: null,
  });
  await mkdir(directory, { recursive: false });
  for (const [name, bytes] of Object.entries({
    'publication.statement': statement,
    policy,
    'key-authority.json': authority,
    'submitter.pub': `${submitterPublicKey}\n`,
  }))
    await writeFile(join(directory, name), bytes, { flag: 'wx', mode: 0o600 });
  await writeJsonFile(join(directory, 'submission.json'), {
    format: 1,
    status: 'not-submitted',
    sequence,
    policySha256: transparencyDigest(policy),
  });
  console.log(
    'Prepared unsigned authority and transparency statement. No signing or network submission performed.',
  );
} else {
  const statement = await readFile(
    join(directory, 'publication.statement'),
    'utf8',
  );
  const parsed = parseStatement(statement);
  const edition = publications.editions.find(
    (item) => item.manifest.sequence === parsed.sequence,
  );
  if (
    !edition ||
    canonicalStatement(
      statementForManifest(edition.bytes, trustedFingerprint),
    ) !== statement
  )
    throw new Error('Statement does not match verified signed publication');
  if (command === 'expected')
    console.log(
      JSON.stringify(
        { format: 1, expectedChecksums: [sigsumChecksum(statement)] },
        null,
        2,
      ),
    );
  else {
    const policySha256 = required('--policy-sha256');
    const policy = await readFile(join(directory, 'policy'), 'utf8');
    if (transparencyDigest(policy) !== policySha256)
      throw new Error('Policy checksum mismatch');
    const authority = await readFile(
      join(directory, 'key-authority.json'),
      'utf8',
    );
    const authoritySignature = await readFile(
      join(directory, 'key-authority.asc'),
      'utf8',
    );
    const submitterPublicKey = await readFile(
      join(directory, 'submitter.pub'),
      'utf8',
    );
    const verifiedAuthority = await verifyAuthority(
      authority,
      authoritySignature,
      root,
      trustedFingerprint,
      parsed.sequence,
    );
    if (verifiedAuthority.submitterPublicKey !== submitterPublicKey.trim())
      throw new Error('Submitter differs from signed authority');
    if (command === 'submit' || command === 'pack') {
      if (command === 'submit' && !allowNetwork)
        throw new Error(
          'Submission requires explicit --allow-network; it publishes a checksum to external logs',
        );
      const proofPath = join(directory, 'publication.sigsum');
      if (command === 'submit') {
        if (await Bun.file(proofPath).exists())
          throw new Error(
            'Proof already exists; verify the retained evidence instead of overwriting it',
          );
        await writeJsonFile(join(directory, 'submission.json'), {
          format: 1,
          status: 'submission-pending',
          sequence: parsed.sequence,
          policySha256,
        });
        await new Promise<void>((resolve, reject) => {
          execFile(
            'sigsum-submit',
            [
              '-k',
              required('--key'),
              '-p',
              join(directory, 'policy'),
              '-o',
              proofPath,
              join(directory, 'publication.statement'),
            ],
            { timeout: 120000, maxBuffer: 65536 },
            (error) => {
              if (error)
                reject(
                  new Error(
                    'Sigsum submission pending or failed; no Logged claim',
                    { cause: error },
                  ),
                );
              else resolve();
            },
          );
        });
      }
      const files = evidenceFiles({
        statement,
        proof: await readFile(proofPath, 'utf8'),
        policy,
        authority,
        authoritySignature,
        submitterPublicKey,
      });
      const result = await verifyTransparencyEvidence(
        files,
        edition.bytes,
        root,
        trustedFingerprint,
        policySha256,
      );
      const inventory = files.get('evidence.json');
      if (!inventory) throw new Error('Missing transparency inventory');
      await writeFile(join(directory, 'evidence.json'), inventory, {
        flag: 'wx',
      });
      await writeJsonFile(join(directory, 'submission.json'), {
        format: 1,
        ...result,
      });
      console.log(JSON.stringify(result));
    } else {
      // Operational status is separate from the immutable seven-file evidence package.
      const files = await readTransparencyEvidence(directory);
      console.log(
        JSON.stringify(
          await verifyTransparencyEvidence(
            files,
            edition.bytes,
            root,
            trustedFingerprint,
            policySha256,
          ),
        ),
      );
    }
  }
}

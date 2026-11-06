import { execFile } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'astro/zod';
import {
  parseStatement,
  statementForManifest,
  canonicalStatement,
  transparencyDigest,
  verifyAuthority,
} from './statement';

const names = [
  'publication.statement',
  'publication.sigsum',
  'policy',
  'key-authority.json',
  'key-authority.asc',
  'submitter.pub',
] as const;
const inventorySchema = z.strictObject({
  format: z.literal('onur.transparency-evidence.v1'),
  files: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)),
});
export function evidenceFiles(input: {
  statement: string;
  proof: string;
  policy: string;
  authority: string;
  authoritySignature: string;
  submitterPublicKey: string;
}): Map<string, Uint8Array> {
  const values = [
    input.statement,
    input.proof,
    input.policy,
    input.authority,
    input.authoritySignature,
    input.submitterPublicKey,
  ];
  const files = new Map<string, Uint8Array>(
    names.map((name, i) => [name, new TextEncoder().encode(values[i])]),
  );
  files.set(
    'evidence.json',
    new TextEncoder().encode(
      `${JSON.stringify({ format: 'onur.transparency-evidence.v1', files: Object.fromEntries([...files].map(([name, bytes]) => [name, transparencyDigest(bytes)])) }, null, 2)}\n`,
    ),
  );
  return files;
}
function text(files: ReadonlyMap<string, Uint8Array>, name: string) {
  const bytes = files.get(name);
  if (!bytes || bytes.length > 2_000_000)
    throw new Error(`Missing or oversized transparency evidence: ${name}`);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
/** Hash inventories detect damage; independently trusted policy and root authenticate meaning. */
export function checkEvidenceBindings(
  files: ReadonlyMap<string, Uint8Array>,
  manifest: string,
  trustedPolicySha256: string,
) {
  const index = inventorySchema.parse(
    JSON.parse(text(files, 'evidence.json')) as unknown,
  );
  if (
    files.size !== names.length + 1 ||
    Object.keys(index.files).length !== names.length
  )
    throw new Error('Unexpected transparency files');
  for (const name of names) {
    const bytes = files.get(name);
    if (!bytes || transparencyDigest(bytes) !== index.files[name])
      throw new Error(`Transparency digest mismatch: ${name}`);
  }
  const statement = parseStatement(text(files, 'publication.statement'));
  if (
    canonicalStatement(
      statementForManifest(manifest, statement.rootFingerprint),
    ) !== text(files, 'publication.statement')
  )
    throw new Error('Transparency statement differs from manifest');
  if (
    !/^[a-f0-9]{64}$/.test(trustedPolicySha256) ||
    transparencyDigest(text(files, 'policy')) !== trustedPolicySha256
  )
    throw new Error(
      'Transparency policy differs from independently pinned policy',
    );
  return statement;
}
/** Official verifier enforces leaf signature, inclusion, log signature and witness quorum offline. */
export async function verifyTransparencyEvidence(
  files: ReadonlyMap<string, Uint8Array>,
  manifest: string,
  root: string,
  trustedFingerprint: string,
  trustedPolicySha256: string,
  executable = 'sigsum-verify',
) {
  const statement = checkEvidenceBindings(files, manifest, trustedPolicySha256);
  if (statement.rootFingerprint !== trustedFingerprint.toUpperCase())
    throw new Error('Transparency statement root mismatch');
  const authority = await verifyAuthority(
    text(files, 'key-authority.json'),
    text(files, 'key-authority.asc'),
    root,
    trustedFingerprint,
    statement.sequence,
  );
  if (text(files, 'submitter.pub').trim() !== authority.submitterPublicKey)
    throw new Error('Unauthorized Sigsum submitter key');
  const directory = await mkdtemp(join(tmpdir(), 'onur-sigsum-'));
  try {
    for (const name of ['publication.sigsum', 'policy', 'submitter.pub'])
      await writeFile(join(directory, name), text(files, name), {
        mode: 0o600,
        flag: 'wx',
      });
    await new Promise<void>((resolve, reject) => {
      const child = execFile(
        executable,
        [
          '-k',
          join(directory, 'submitter.pub'),
          '-p',
          join(directory, 'policy'),
          join(directory, 'publication.sigsum'),
        ],
        { timeout: 15000, maxBuffer: 65536 },
        (error) => {
          if (error)
            reject(
              new Error('Sigsum inclusion/quorum verification failed', {
                cause: error,
              }),
            );
          else resolve();
        },
      );
      child.stdin?.end(text(files, 'publication.statement'));
    });
    return {
      status: 'logged' as const,
      sequence: statement.sequence,
      policySha256: trustedPolicySha256,
      externallyObserved: false as const,
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
export async function readTransparencyEvidence(
  directory: string,
): Promise<Map<string, Uint8Array>> {
  const actual = await readdir(directory);
  if (
    actual.filter((name) => name !== 'submission.json').length !==
      names.length + 1 ||
    actual.some(
      (name) =>
        !(
          [...names, 'evidence.json', 'submission.json'] as readonly string[]
        ).includes(name),
    )
  )
    throw new Error('Unexpected transparency evidence directory');
  return new Map(
    await Promise.all(
      [...names, 'evidence.json'].map(
        async (name) => [name, await readFile(join(directory, name))] as const,
      ),
    ),
  );
}
/** Bundle integration is additive; verify this package before passing these files to an archive. */
export function transparencyArchiveFiles(
  sequence: number,
  files: ReadonlyMap<string, Uint8Array>,
) {
  if (!Number.isSafeInteger(sequence) || sequence < 1)
    throw new Error('Invalid publication sequence');
  return new Map(
    [...files].map(([name, bytes]) => {
      if (!([...names, 'evidence.json'] as readonly string[]).includes(name))
        throw new Error('Unexpected transparency archive path');
      return [
        `transparency/publication-v${String(sequence)}/${name}`,
        bytes,
      ] as const;
    }),
  );
}

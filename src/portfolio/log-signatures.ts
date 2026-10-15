import { createHash } from 'node:crypto';
import { z } from 'astro/zod';
import { verifyBytes } from './proofs';
import { revisionMarkdown, type LogEntry } from './log';
export const digest = (body: string) =>
  createHash('sha256').update(body, 'utf8').digest('hex');
const schema = z.record(
  z.string().regex(/^[a-z0-9][a-z0-9-]*-v[1-9][0-9]*$/),
  z
    .object({
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      signature: z
        .string()
        .max(32768)
        .startsWith('-----BEGIN PGP SIGNATURE-----'),
    })
    .strict(),
);
export async function verifyLogSignatures(
  entries: readonly LogEntry[],
  input: unknown,
  publicKey: string,
) {
  const artifacts = schema.parse(input);
  const verified: Record<
    string,
    { sha256: string; signature: string; fingerprint: string }
  > = {};
  const revisions = new Map<string, string>(
    entries.flatMap((entry) =>
      entry.revisions.map(
        (revision) =>
          [
            `${entry.id}-v${revision.version}`,
            revisionMarkdown(entry, revision.version),
          ] as const,
      ),
    ),
  );
  for (const [id, artifact] of Object.entries(artifacts)) {
    const body = revisions.get(id);
    if (!body || digest(body) !== artifact.sha256)
      throw new Error(`Log revision changed since signing: ${id}`);
    const fingerprint = await verifyBytes(body, artifact.signature, publicKey);
    verified[id] = { ...artifact, fingerprint };
  }
  return verified;
}

export function assertAllLogRevisionsSigned(
  entries: readonly LogEntry[],
  signatures: Record<string, unknown>,
): void {
  for (const entry of entries) {
    for (const revision of entry.revisions) {
      const id = `${entry.id}-v${revision.version}`;
      if (!signatures[id]) throw new Error(`Missing PGP signature for ${id}`);
    }
  }
}

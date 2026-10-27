import { z } from 'astro/zod';
import {
  annotationSchema,
  annotationBytes,
  type AnnotationPayload,
} from './protocol';
export const savedKeysSchema = z.object({
  publicKey: z.string(),
  privateKey: z.object({
    kty: z.string(),
    crv: z.string(),
    d: z.string(),
    x: z.string(),
  }),
});
const backupSchema = z.strictObject({
  format: z.literal('onur-annotation-backup-v1'),
  keys: savedKeysSchema,
  notes: z.array(annotationSchema).max(10000),
});
export function mergeOwned(
  current: readonly AnnotationPayload[],
  incoming: readonly AnnotationPayload[],
): AnnotationPayload[] {
  const entries = new Map(current.map((p) => [p.id, p]));
  for (const p of incoming) {
    annotationSchema.parse(p);
    const old = entries.get(p.id);
    if (!old || p.sequence > old.sequence) entries.set(p.id, p);
    else if (
      p.sequence === old.sequence &&
      annotationBytes(p) !== annotationBytes(old)
    )
      throw new Error('Conflicting annotation management metadata');
  }
  return [...entries.values()].sort((a, b) => a.id.localeCompare(b.id));
}
export function exportManagement(
  keys: z.infer<typeof savedKeysSchema>,
  notes: readonly AnnotationPayload[],
): string {
  return JSON.stringify(
    {
      format: 'onur-annotation-backup-v1',
      keys: savedKeysSchema.parse(keys),
      notes: mergeOwned(
        [],
        notes.filter((p) => p.publicKey === keys.publicKey),
      ),
    },
    null,
    2,
  );
}
export function importManagement(text: string): {
  keys: z.infer<typeof savedKeysSchema>;
  notes: AnnotationPayload[];
} {
  const input: unknown = JSON.parse(text);
  const backup = backupSchema.safeParse(input);
  if (backup.success)
    return {
      keys: backup.data.keys,
      notes: backup.data.notes.filter(
        (p) => p.publicKey === backup.data.keys.publicKey,
      ),
    };
  return { keys: savedKeysSchema.parse(input), notes: [] };
}

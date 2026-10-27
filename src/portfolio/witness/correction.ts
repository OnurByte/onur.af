import {
  createHash,
  createPublicKey,
  sign,
  verify,
  type KeyObject,
} from 'node:crypto';
import { z } from 'astro/zod';
export const correctionSchema = z.strictObject({
  record: z.strictObject({
    format: z.literal('onur-witness-correction-v1'),
    id: z.uuid(),
    eventId: z.uuid(),
    suppressed: z.boolean(),
    reason: z.string().trim().min(1).max(1000),
    createdAt: z.iso.datetime(),
    previous: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    keyId: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  signature: z.string().max(1024),
});
export type Correction = z.infer<typeof correctionSchema>;
function bytes(record: Correction['record']): Buffer {
  return Buffer.from(
    JSON.stringify([
      record.format,
      record.id,
      record.eventId,
      record.suppressed,
      record.reason,
      record.createdAt,
      record.previous,
      record.keyId,
    ]) + '\n',
  );
}
export function correctionHash(record: Correction['record']): string {
  return createHash('sha256').update(bytes(record)).digest('hex');
}
function keyHash(key: KeyObject): string {
  return createHash('sha256')
    .update(
      (key.type === 'public' ? key : createPublicKey(key)).export({
        type: 'spki',
        format: 'der',
      }),
    )
    .digest('hex');
}
export function signCorrection(
  meta: Omit<Correction['record'], 'format' | 'keyId'>,
  key: KeyObject,
): Correction {
  if (key.asymmetricKeyType !== 'ed25519')
    throw new Error('Ed25519 witness key required');
  const record: Correction['record'] = {
    format: 'onur-witness-correction-v1',
    ...meta,
    keyId: keyHash(key),
  };
  const correction = {
    record,
    signature: sign(null, bytes(record), key).toString('base64'),
  };
  correctionSchema.parse(correction);
  return correction;
}
export function auditCorrections(
  records: readonly Correction[],
  key: KeyObject | ((id: string, time: string) => KeyObject),
  events: ReadonlySet<string>,
): { suppressed: Set<string>; checkpoint: string | null } {
  let previous: string | null = null;
  const suppressed = new Set<string>();
  const ids = new Set<string>();
  for (const correction of records) {
    correctionSchema.parse(correction);
    const { record, signature } = correction;
    const verificationKey =
      typeof key === 'function' ? key(record.keyId, record.createdAt) : key;
    if (
      record.previous !== previous ||
      record.keyId !== keyHash(verificationKey) ||
      ids.has(record.id) ||
      !events.has(record.eventId) ||
      !verify(
        null,
        bytes(record),
        verificationKey,
        Buffer.from(signature, 'base64'),
      )
    )
      throw new Error('Invalid witness correction chain');
    ids.add(record.id);
    if (record.suppressed) suppressed.add(record.eventId);
    else suppressed.delete(record.eventId);
    previous = correctionHash(record);
  }
  return { suppressed, checkpoint: previous };
}

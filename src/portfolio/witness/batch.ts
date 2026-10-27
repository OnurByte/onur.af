import { z } from 'astro/zod';
import { witnessEventSchema } from './protocol';
export const batchEvidenceSchema = z.strictObject({
  manifest: z.strictObject({
    format: z.literal('onur-witness-batch-v1'),
    id: z.uuid(),
    previous: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    createdAt: z.iso.datetime(),
    count: z.number().int().positive(),
    root: z.string().regex(/^[a-f0-9]{64}$/),
    keyId: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  events: z.array(witnessEventSchema).min(1).max(10000),
  signature: z.string().max(1024),
});
import { required } from '../required';
import { createHash, sign, verify, type KeyObject } from 'node:crypto';
import { eventHash, merkleTree, type WitnessEvent } from './protocol';
export interface BatchManifest {
  format: 'onur-witness-batch-v1';
  id: string;
  previous: string | null;
  createdAt: string;
  count: number;
  root: string;
  keyId: string;
}
export interface BatchEvidence {
  manifest: BatchManifest;
  events: WitnessEvent[];
  signature: string;
}
function manifestBytes(m: BatchManifest): string {
  return (
    JSON.stringify([
      m.format,
      m.id,
      m.previous,
      m.createdAt,
      m.count,
      m.root,
      m.keyId,
    ]) + '\n'
  );
}
export function manifestHash(m: BatchManifest): string {
  return createHash('sha256').update(manifestBytes(m)).digest('hex');
}
function keyId(key: KeyObject): string {
  const publicKey = key.type === 'public' ? key : requirePublic(key);
  return createHash('sha256')
    .update(publicKey.export({ type: 'spki', format: 'der' }))
    .digest('hex');
}
import { createPublicKey } from 'node:crypto';
function requirePublic(key: KeyObject): KeyObject {
  return createPublicKey(key);
}
export function buildBatch(
  events: readonly WitnessEvent[],
  meta: {
    id: string;
    previous: string | null;
    createdAt: string;
  },
  privateKey: KeyObject,
): BatchEvidence {
  if (privateKey.asymmetricKeyType !== 'ed25519')
    throw new Error('Witness key must be Ed25519');
  const ordered = [...events].sort((a, b) =>
    a.eventId.localeCompare(b.eventId, 'en'),
  );
  if (new Set(ordered.map((e) => e.eventId)).size !== ordered.length)
    throw new Error('Duplicate event');
  const root = merkleTree(ordered.map(eventHash)).root;
  const manifest: BatchManifest = {
    format: 'onur-witness-batch-v1',
    ...meta,
    count: ordered.length,
    root,
    keyId: keyId(privateKey),
  };
  return {
    manifest,
    events: ordered,
    signature: sign(
      null,
      Buffer.from(manifestBytes(manifest)),
      privateKey,
    ).toString('base64'),
  };
}
export function auditBatch(
  evidence: BatchEvidence,
  publicKey: KeyObject,
  previous: string | null,
): {
  total: number;
  days: Record<string, number>;
  hash: string;
} {
  batchEvidenceSchema.parse(evidence);
  const { manifest: m, events, signature } = evidence;
  if (
    m.previous !== previous ||
    m.keyId !== keyId(publicKey) ||
    m.count !== events.length ||
    !events.length
  )
    throw new Error('Invalid witness manifest or chain');
  if (
    !verify(
      null,
      Buffer.from(manifestBytes(m)),
      publicKey,
      Buffer.from(signature, 'base64'),
    )
  )
    throw new Error('Invalid witness signature');
  if (new Set(events.map((e) => e.eventId)).size !== events.length)
    throw new Error('Duplicate event');
  if (
    events.some(
      (e, i) =>
        i > 0 &&
        required(events[i - 1]).eventId.localeCompare(e.eventId, 'en') >= 0,
    )
  )
    throw new Error('Unordered events');
  if (merkleTree(events.map(eventHash)).root !== m.root)
    throw new Error('Merkle root mismatch');
  const days: Record<string, number> = {};
  for (const event of events) days[event.day] = (days[event.day] ?? 0) + 1;
  return { total: events.length, days, hash: manifestHash(m) };
}

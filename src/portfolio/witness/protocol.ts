import { z } from 'astro/zod';
export const witnessEventSchema = z.strictObject({
  format: z.literal('onur-witness-event-v1'),
  eventId: z.uuid(),
  logId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,127}$/),
  revision: z.number().int().positive(),
  day: z.iso.date(),
  nonce: z.string().regex(/^[a-f0-9]{64}$/),
});
import { required } from '../required';
import { createHash, createHmac } from 'node:crypto';
export interface WitnessEvent {
  format: 'onur-witness-event-v1';
  eventId: string;
  logId: string;
  revision: number;
  day: string;
  nonce: string;
}
export interface InclusionStep {
  side: 'left' | 'right';
  hash: string;
}
const hex = /^[a-f0-9]{64}$/;
const digest = (bytes: Uint8Array): string =>
  createHash('sha256').update(bytes).digest('hex');
export function canonicalEvent(event: WitnessEvent): string {
  witnessEventSchema.parse(event);
  if (
    !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(event.eventId) ||
    !/^[a-z0-9][a-z0-9-]{0,127}$/.test(event.logId) ||
    !Number.isSafeInteger(event.revision) ||
    event.revision < 1 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(event.day) ||
    !Number.isFinite(Date.parse(event.day)) ||
    new Date(event.day).toISOString().slice(0, 10) !== event.day ||
    !hex.test(event.nonce)
  )
    throw new Error('Invalid witness event');
  return (
    JSON.stringify([
      event.format,
      event.eventId,
      event.logId,
      event.revision,
      event.day,
      event.nonce,
    ]) + '\n'
  );
}
export function eventHash(event: WitnessEvent): string {
  return digest(Buffer.from(canonicalEvent(event), 'utf8'));
}
function leaf(hash: string): string {
  if (!hex.test(hash)) throw new Error('Invalid commitment');
  return digest(Buffer.concat([Buffer.from([0]), Buffer.from(hash, 'hex')]));
}
function branch(left: string, right: string): string {
  return digest(
    Buffer.concat([
      Buffer.from([1]),
      Buffer.from(left, 'hex'),
      Buffer.from(right, 'hex'),
    ]),
  );
}
/** Input order is retained. Batch callers sort by event ID before construction.
 * An unpaired node is promoted unchanged, never duplicated. */
export function merkleTree(hashes: readonly string[]): {
  root: string;
  paths: InclusionStep[][];
} {
  if (!hashes.length) throw new Error('Empty witness batch');
  const paths: InclusionStep[][] = hashes.map(() => []);
  let nodes = hashes.map((hash, index) => ({
    hash: leaf(hash),
    indices: [index],
  }));
  while (nodes.length > 1) {
    const next: typeof nodes = [];
    for (let i = 0; i < nodes.length; i += 2) {
      const left = required(nodes[i]);
      const right = nodes[i + 1];
      if (!right) {
        next.push(left);
        continue;
      }
      for (const index of left.indices)
        required(paths[index]).push({ side: 'right', hash: right.hash });
      for (const index of right.indices)
        required(paths[index]).push({ side: 'left', hash: left.hash });
      next.push({
        hash: branch(left.hash, right.hash),
        indices: [...left.indices, ...right.indices],
      });
    }
    nodes = next;
  }
  return { root: required(nodes[0]).hash, paths };
}
export function verifyInclusion(
  hash: string,
  path: readonly InclusionStep[],
  root: string,
): boolean {
  if (!hex.test(hash) || !hex.test(root) || path.length > 64) return false;
  let current = leaf(hash);
  for (const step of path) {
    if (!hex.test(step.hash) || !['left', 'right'].includes(step.side))
      return false;
    current =
      step.side === 'left'
        ? branch(step.hash, current)
        : branch(current, step.hash);
  }
  return current === root;
}
export function witnessHmac(
  secret: string,
  logId: string,
  generation: string,
  visitorId: string,
): string {
  if (Buffer.byteLength(secret) < 32)
    throw new Error('Witness secret must contain at least 32 bytes');
  return createHmac('sha256', secret)
    .update(
      JSON.stringify(['onur-witness-subject-v1', logId, generation, visitorId]),
    )
    .digest('hex');
}

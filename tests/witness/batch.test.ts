import { required } from '../../src/portfolio/required';
import { expect, test } from 'bun:test';
import { generateKeyPairSync } from 'node:crypto';
import {
  buildBatch,
  auditBatch,
  type BatchEvidence,
} from '../../src/portfolio/witness/batch';
const event = {
  format: 'onur-witness-event-v1' as const,
  eventId: '9d3ef18b-5492-4e6b-9ea7-e7ef02acda73',
  logId: 'example',
  revision: 1,
  day: '2026-10-27',
  nonce: 'ab'.repeat(32),
};
test('signed batches independently recount public events and reject edits and chain breaks', () => {
  const keys = generateKeyPairSync('ed25519');
  const evidence = buildBatch(
    [event],
    {
      id: crypto.randomUUID(),
      previous: null,
      createdAt: '2026-10-27T00:00:00.000Z',
    },
    keys.privateKey,
  );
  expect(auditBatch(evidence, keys.publicKey, null).total).toBe(1);
  const tampered = structuredClone<BatchEvidence>(evidence);
  required(tampered.events[0]).revision = 2;
  expect(() => auditBatch(tampered, keys.publicKey, null)).toThrow();
  expect(() => auditBatch(evidence, keys.publicKey, 'ab'.repeat(32))).toThrow();
  expect(() =>
    buildBatch(
      [event, event],
      {
        id: crypto.randomUUID(),
        previous: null,
        createdAt: '2026-10-27T00:00:00.000Z',
      },
      keys.privateKey,
    ),
  ).toThrow();
});

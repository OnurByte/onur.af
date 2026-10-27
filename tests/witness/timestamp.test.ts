import { expect, test } from 'bun:test';
import ots from 'opentimestamps';
import { validateWitnessTimestamp } from '../../src/server/witness/timestamp';
import { createHash } from 'node:crypto';
test('pending timestamp binds exact batch root and never grants Bitcoin status', () => {
  const root = 'ab'.repeat(32);
  const detached = ots.DetachedTimestampFile.fromBytes(
    new ots.Ops.OpSHA256(),
    Buffer.from(root, 'hex'),
  );
  detached.timestamp.attestations.push(
    new ots.Notary.PendingAttestation('https://calendar.example'),
  );
  const bytes = new Uint8Array(detached.serializeToBytes());
  expect(validateWitnessTimestamp(bytes, root)).toBe('pending');
  expect(() => validateWitnessTimestamp(bytes, 'cd'.repeat(32))).toThrow();
  expect(
    createHash('sha256').update(Buffer.from(root, 'hex')).digest('hex'),
  ).toBe(Buffer.from(detached.fileDigest()).toString('hex'));
});

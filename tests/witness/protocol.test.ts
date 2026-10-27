import { required } from '../../src/portfolio/required';
import { expect, test } from 'bun:test';
import {
  canonicalEvent,
  eventHash,
  merkleTree,
  verifyInclusion,
  witnessHmac,
} from '../../src/portfolio/witness/protocol';
const event = {
  format: 'onur-witness-event-v1' as const,
  eventId: '9d3ef18b-5492-4e6b-9ea7-e7ef02acda73',
  logId: 'example',
  revision: 1,
  day: '2026-10-27',
  nonce: 'ab'.repeat(32),
};
test('canonical event bytes are frozen and reject invalid dates', () => {
  expect(canonicalEvent(event)).toBe(
    JSON.stringify([
      'onur-witness-event-v1',
      event.eventId,
      'example',
      1,
      '2026-10-27',
      event.nonce,
    ]) + '\n',
  );
  expect(() => canonicalEvent({ ...event, day: '2026-02-30' })).toThrow();
});
test('Merkle proofs cover every leaf including odd trees and reject tampering', () => {
  const hashes = [1, 2, 3, 4, 5].map((revision) =>
    eventHash({ ...event, revision }),
  );
  const tree = merkleTree(hashes);
  for (let i = 0; i < hashes.length; i++) {
    expect(
      verifyInclusion(required(hashes[i]), required(tree.paths[i]), tree.root),
    ).toBe(true);
    expect(
      verifyInclusion('00'.repeat(32), required(tree.paths[i]), tree.root),
    ).toBe(false);
  }
  expect(() => merkleTree([])).toThrow();
  expect(
    verifyInclusion(
      required(hashes[0]),
      [{ side: 'left', hash: 'oops' }],
      tree.root,
    ),
  ).toBe(false);
});
test('fingerprint HMAC is scoped to Log and generation', () => {
  const secret = 's'.repeat(32);
  expect(witnessHmac(secret, 'a', 'v1', 'visitor')).not.toBe(
    witnessHmac(secret, 'b', 'v1', 'visitor'),
  );
  expect(witnessHmac(secret, 'a', 'v1', 'visitor')).not.toBe(
    witnessHmac(secret, 'a', 'v2', 'visitor'),
  );
});

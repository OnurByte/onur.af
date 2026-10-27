import { expect, test } from 'bun:test';
import { generateKeyPairSync } from 'node:crypto';
import {
  signCorrection,
  auditCorrections,
} from '../../src/portfolio/witness/correction';
test('corrections append a signed chain without rewriting historical events', () => {
  const keys = generateKeyPairSync('ed25519');
  const eventId = crypto.randomUUID();
  const first = signCorrection(
    {
      id: crypto.randomUUID(),
      eventId,
      suppressed: true,
      reason: 'Fixture correction',
      createdAt: '2026-10-27T00:00:00.000Z',
      previous: null,
    },
    keys.privateKey,
  );
  const result = auditCorrections([first], keys.publicKey, new Set([eventId]));
  expect(result.suppressed.has(eventId)).toBe(true);
  expect(() =>
    auditCorrections(
      [{ ...first, record: { ...first.record, suppressed: false } }],
      keys.publicKey,
      new Set([eventId]),
    ),
  ).toThrow();
  expect(() => auditCorrections([first], keys.publicKey, new Set())).toThrow();
});

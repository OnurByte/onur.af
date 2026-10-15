import { expect, test } from 'bun:test';
import { upgradeReceipts } from '../scripts/log-timestamps';
const receipt = {
  sha256: 'a'.repeat(64),
  signatureSha256: 'b'.repeat(64),
  proof: 'proof',
};
test('persists earlier success before later failure and continues other receipts', async () => {
  const events: string[] = [];
  const failed = await upgradeReceipts(
    ['first', 'broken', 'last'],
    async (key) => {
      events.push(`upgrade:${key}`);
      if (key === 'broken') throw new Error('temporary outage');
      return receipt;
    },
    async (key) => {
      events.push(`save:${key}`);
    },
  );
  expect(failed).toEqual(['broken']);
  expect(events).toEqual([
    'upgrade:first',
    'save:first',
    'upgrade:broken',
    'upgrade:last',
    'save:last',
  ]);
});
test('failed validation or persistence does not stop later receipts', async () => {
  const saved: string[] = [];
  const failed = await upgradeReceipts(
    ['invalid', 'valid'],
    async () => receipt,
    async (key) => {
      if (key === 'invalid') throw new Error('validation failed');
      saved.push(key);
    },
  );
  expect(failed).toEqual(['invalid']);
  expect(saved).toEqual(['valid']);
});

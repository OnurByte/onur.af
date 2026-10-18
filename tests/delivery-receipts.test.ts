import { expect, test } from 'bun:test';
import {
  parseDeliveryReceipts,
  type DeliveryReceipt,
} from '../src/portfolio/webmention';

test('delivery receipts validate persisted data before retry decisions', () => {
  const receipt: DeliveryReceipt = {
    source: 'https://portfolio.example/log/example',
    target: 'https://source.example/article',
    sha256: 'a'.repeat(64),
    status: 'sent',
    attemptedAt: '2026-10-17T00:00:00.000Z',
  };
  expect(parseDeliveryReceipts([receipt])).toEqual([receipt]);
  for (const invalid of [
    null,
    {},
    [null],
    [{ ...receipt, status: 'success' }],
    [{ ...receipt, sha256: 'invalid' }],
    [{ ...receipt, attemptedAt: 'yesterday' }],
  ]) {
    expect(() => parseDeliveryReceipts(invalid)).toThrow();
  }
});

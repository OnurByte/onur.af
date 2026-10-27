import { expect, test } from 'bun:test';
import { auditAggregate } from '../../src/portfolio/witness/aggregate';
const event = {
  format: 'onur-witness-event-v1' as const,
  eventId: crypto.randomUUID(),
  logId: 'example',
  revision: 1,
  day: '2026-10-27',
  nonce: 'ab'.repeat(32),
};
test('aggregate audit compares published UTC counts and distinguishes unsealed records', () => {
  const snapshot = {
    logId: 'example',
    period: { days: 30, range: null },
    stats: {
      allTime: 1,
      recorded: 1,
      sealed: 1,
      days: [{ day: '2026-10-27', count: 1 }],
      asOf: '2026-10-27T12:00:00.000Z',
    },
  };
  expect(auditAggregate([event], new Set(), snapshot).complete).toBe(true);
  expect(() =>
    auditAggregate([event], new Set(), {
      ...snapshot,
      stats: { ...snapshot.stats, days: [{ day: '2026-10-27', count: 2 }] },
    }),
  ).toThrow();
  expect(
    auditAggregate([event], new Set(), {
      ...snapshot,
      stats: { ...snapshot.stats, recorded: 2 },
    }).complete,
  ).toBe(false);
});

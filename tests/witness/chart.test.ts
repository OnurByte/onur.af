import { expect, test } from 'bun:test';
import { dailySeries } from '../../src/portfolio/witness/chart';
test('daily chart fills absent UTC days without inventing recorded visits', () => {
  const chart = dailySeries([{ day: '2026-10-27', count: 2 }], 3, '2026-10-27');
  expect(chart.days).toEqual([
    { day: '2026-10-25', count: 0 },
    { day: '2026-10-26', count: 0 },
    { day: '2026-10-27', count: 2 },
  ]);
  expect(chart.points).toBe('0,100 300,100 600,0');
});

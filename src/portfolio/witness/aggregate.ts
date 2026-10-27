import { z } from 'astro/zod';
import type { WitnessEvent } from './protocol';
export const aggregateSnapshotSchema = z.object({
  logId: z.string(),
  period: z.object({
    days: z.number().int().positive().nullable(),
    range: z.object({ from: z.iso.date(), to: z.iso.date() }).nullable(),
  }),
  stats: z.object({
    allTime: z.number().int().nonnegative(),
    recorded: z.number().int().nonnegative(),
    sealed: z.number().int().nonnegative(),
    asOf: z.iso.datetime(),
    days: z.array(
      z.object({ day: z.iso.date(), count: z.number().int().nonnegative() }),
    ),
  }),
});
export function auditAggregate(
  events: readonly WitnessEvent[],
  suppressed: ReadonlySet<string>,
  input: z.infer<typeof aggregateSnapshotSchema>,
): {
  complete: boolean;
  publishedUnique: number;
  unsealed: number;
  daily: Record<string, number>;
} {
  const snapshot = aggregateSnapshotSchema.parse(input);
  const { stats, period, logId } = snapshot;
  const published = events.filter((e) => e.logId === logId);
  if (published.length !== stats.sealed || stats.recorded < stats.sealed)
    throw new Error('Published coverage mismatch');
  const effective = published.filter((e) => !suppressed.has(e.eventId));
  const to = period.range?.to ?? stats.asOf.slice(0, 10);
  const from =
    period.range?.from ??
    (period.days === null
      ? null
      : new Date(Date.parse(to) - (period.days - 1) * 86400000)
          .toISOString()
          .slice(0, 10));
  const daily: Record<string, number> = {};
  for (const event of effective) {
    if ((from === null || event.day >= from) && event.day <= to)
      daily[event.day] = (daily[event.day] ?? 0) + 1;
  }
  const complete = stats.recorded === stats.sealed;
  if (complete) {
    if (effective.length !== stats.allTime)
      throw new Error('Published unique total mismatch');
    const actual = stats.days
      .filter((row) => row.count > 0)
      .sort((a, b) => a.day.localeCompare(b.day));
    const expected = Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({ day, count }));
    if (JSON.stringify(actual) !== JSON.stringify(expected))
      throw new Error('Published UTC daily aggregate mismatch');
  }
  return {
    complete,
    publishedUnique: effective.length,
    unsealed: stats.recorded - stats.sealed,
    daily,
  };
}

export function dailySeries(
  rows: readonly { day: string; count: number }[],
  period: number | null,
  today: string,
): { days: { day: string; count: number }[]; points: string } {
  const end = Date.parse(today);
  const start =
    period === null
      ? rows[0]
        ? Date.parse(rows[0].day)
        : end
      : end - (period - 1) * 86400000;
  const values = new Map(rows.map((row) => [row.day, row.count]));
  const days: { day: string; count: number }[] = [];
  for (let time = start; time <= end; time += 86400000) {
    const day = new Date(time).toISOString().slice(0, 10);
    days.push({ day, count: values.get(day) ?? 0 });
  }
  const max = Math.max(1, ...days.map((row) => row.count));
  return {
    days,
    points: days
      .map(
        (row, i) =>
          `${String(days.length === 1 ? 300 : Math.round((i / (days.length - 1)) * 600))},${String(Math.round(100 - (row.count / max) * 100))}`,
      )
      .join(' '),
  };
}

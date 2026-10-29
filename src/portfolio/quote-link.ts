/** Offsets use DOM/JavaScript UTF-16 units, matching Range and annotations. */
export function parseQuoteRange(value: string | undefined) {
  const match = value?.match(/^v([1-9][0-9]*)-(0|[1-9][0-9]*)-([1-9][0-9]*)$/);
  if (!match) return null;
  const revision = Number(match[1]);
  const start = Number(match[2]);
  const end = Number(match[3]);
  if (![revision, start, end].every(Number.isSafeInteger) || end <= start)
    return null;
  return { revision, start, end };
}
export function quotePath(
  logId: string,
  revision: number,
  start: number,
  end: number,
): string {
  return `/log/${encodeURIComponent(logId)}/quote/v${String(revision)}-${String(start)}-${String(end)}`;
}

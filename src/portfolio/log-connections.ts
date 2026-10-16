import { logEntries, logMetadata, logUrl, type LogEntry } from './log';
import { renderLogContent } from './log-markdown';

export function logConnections(
  entry: LogEntry,
  entries: readonly LogEntry[] = logEntries,
  origin?: string,
) {
  const tags = new Set(logMetadata(entry).tags);
  const others = entries.filter((candidate) => candidate.id !== entry.id);
  const byDate = (a: LogEntry, b: LogEntry) =>
    Date.parse(b.revisions[0]!.publishedAt) -
      Date.parse(a.revisions[0]!.publishedAt) || a.id.localeCompare(b.id, 'en');
  const ranked = others.map((candidate) => ({
    entry: candidate,
    overlap: logMetadata(candidate).tags.filter((tag) => tags.has(tag)).length,
  }));
  const related = ranked
    .filter((item) => item.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || byDate(a.entry, b.entry))
    .slice(0, 3)
    .map((item) => item.entry);
  const base = origin ?? 'https://log.invalid';
  const referencedBy = others
    .filter((candidate) =>
      [
        ...renderLogContent(candidate.revisions.at(-1)!.body).links,
        ...logMetadata(candidate).sources.map((source) => source.url),
      ].some((href) => {
        try {
          const target = new URL(href, new URL(logUrl(candidate), base));
          return (
            target.origin === new URL(base).origin &&
            target.pathname === logUrl(entry)
          );
        } catch {
          return false;
        }
      }),
    )
    .sort(byDate);
  return { related, referencedBy };
}

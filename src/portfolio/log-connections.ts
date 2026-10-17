import { logEntries, logMetadata, type LogEntry } from './log';
import { buildContentIndex } from './content-index';

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
  const referring = new Set(
    buildContentIndex(entries, origin)
      .referencedBy(entry.id)
      .map((document) => document.id),
  );
  const referencedBy = others
    .filter((candidate) => referring.has(candidate.id))
    .sort(byDate);
  return { related, referencedBy };
}

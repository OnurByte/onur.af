import {
  logEntries,
  logMetadata,
  logTagDefinitions,
  type LogEntry,
} from './log';
export const logTagUrl = (slug: string) => `/log/tag/${slug}`;
export function logTags(entries: readonly LogEntry[] = logEntries) {
  return Object.entries(logTagDefinitions).flatMap(([slug, definition]) => {
    const matches = entries.filter((entry) =>
      logMetadata(entry).tags.includes(slug),
    );
    return matches.length ? [{ slug, ...definition, entries: matches }] : [];
  });
}
export function logTagIndexable(
  slug: string,
  entries: readonly LogEntry[] = logEntries,
) {
  return logTags(entries).some((tag) => tag.slug === slug && tag.indexable);
}

import { logEntries, type LogEntry } from './log';
import editorial from '../content/log-connections.json' with { type: 'json' };
import { buildContentIndex } from './content-index';

interface ReadingConnection {
  from: string;
  to: string;
  reason: string;
}
function validateConnections(
  connections: readonly ReadingConnection[],
  entries: readonly LogEntry[],
) {
  const ids = new Set(entries.map((entry) => entry.id));
  const seen = new Set<string>();
  for (const connection of connections) {
    const key = `${connection.from}/${connection.to}`;
    if (
      !ids.has(connection.from) ||
      !ids.has(connection.to) ||
      connection.from === connection.to ||
      !connection.reason.trim() ||
      seen.has(key)
    )
      throw new Error(`Invalid editorial connection: ${key}`);
    seen.add(key);
  }
}
validateConnections(editorial, logEntries);

export function logConnections(
  entry: LogEntry,
  entries: readonly LogEntry[] = logEntries,
  origin?: string,
  curated: readonly ReadingConnection[] = editorial,
) {
  validateConnections(curated, entries);
  const others = entries.filter((candidate) => candidate.id !== entry.id);
  const byDate = (a: LogEntry, b: LogEntry) =>
    Date.parse(b.revisions[0]!.publishedAt) -
      Date.parse(a.revisions[0]!.publishedAt) || a.id.localeCompare(b.id, 'en');
  const related = curated
    .filter((connection) => connection.from === entry.id)
    .map((connection) => ({
      ...others.find((candidate) => candidate.id === connection.to)!,
      reason: connection.reason,
    }));
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

import { logEntries, logFeedEntries } from './log';
import { z } from 'astro/zod';
import { rssEntrySchema } from '../content/schema';

export type RssEntry = z.infer<typeof rssEntrySchema>;
export function parseRssEntries(input: unknown): RssEntry[] {
  const entries = z.array(rssEntrySchema).parse(input);
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id))
      throw new Error(`Duplicate RSS entry id: ${entry.id}`);
    ids.add(entry.id);
  }
  return entries.sort(
    (a, b) =>
      Date.parse(b.publishedAt) - Date.parse(a.publishedAt) ||
      a.id.localeCompare(b.id, 'en'),
  );
}
export const rssEntries = parseRssEntries(logFeedEntries(logEntries));

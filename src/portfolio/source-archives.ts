import { z } from 'astro/zod';
import { buildContentIndex } from './content-index';
import { logEntries, type LogEntry } from './log';
import rawArchives from '../content/source-archives.json';

const archiveSchema = z.record(
  z.url(),
  z
    .object({
      url: z.url().refine((href) => {
        const url = new URL(href);
        return url.protocol === 'https:' && !url.username && !url.password;
      }),
      capturedAt: z.iso.datetime({ offset: true }),
    })
    .strict(),
);

export function sourceUrls(entries: readonly LogEntry[]) {
  // Preserve links from archived revisions too: published citations must remain checkable.
  const urls = entries.flatMap((entry) =>
    entry.revisions.flatMap(
      (revision) =>
        buildContentIndex([{ ...entry, revisions: [revision] }]).documents[0]!
          .externalLinks,
    ),
  );
  return [...new Set(urls)].sort();
}
export function parseSourceArchives(
  input: unknown,
  entries: readonly LogEntry[],
) {
  const store = archiveSchema.parse(input);
  const sources = new Set(sourceUrls(entries));
  const normalized: typeof store = {};
  for (const [source, capture] of Object.entries(store)) {
    const url = new URL(source).href;
    if (Object.hasOwn(normalized, url))
      throw new Error(`Duplicate archive source: ${url}`);
    if (!sources.has(url))
      throw new Error(
        `Archive source is absent from published revisions: ${source}`,
      );
    normalized[url] = capture;
  }
  return normalized;
}
export const sourceArchives = parseSourceArchives(rawArchives, logEntries);

export function archiveForSource(
  url: string,
  store: ReturnType<typeof parseSourceArchives> = sourceArchives,
) {
  try {
    return store[new URL(url).href];
  } catch {
    return undefined;
  }
}

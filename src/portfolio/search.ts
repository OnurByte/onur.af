import { logEntries, logUrl, type LogEntry } from './log';
import pages from '../content/public-pages.json' with { type: 'json' };

// Fixed public metadata only: never crawl checkout URLs or payment data.
export const searchPages = pages.map(({ id, title, description }) => ({
  url: id,
  meta: { title, description },
}));

export function logSearchEntries(entries: readonly LogEntry[]) {
  return entries.map((entry) => ({
    url: logUrl(entry),
    meta: { title: entry.title, description: entry.summary },
    searchText: [entry.title, entry.summary, entry.revisions.at(-1)!.body].join(
      ' ',
    ),
  }));
}
export const searchEntries = [
  ...searchPages.map((page) => ({
    ...page,
    searchText: `${page.meta.title} ${page.meta.description}`,
  })),
  ...logSearchEntries(logEntries),
];

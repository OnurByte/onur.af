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
const homeEmbedEntries = [
  {
    url: '/#embed-x',
    meta: { title: 'X posts', description: 'Recent posts from @onurstirner.' },
    searchText: 'X posts Twitter @onurstirner embed',
  },
  {
    url: '/#embed-github',
    meta: {
      title: 'GitHub repositories',
      description: 'Recent repositories from onurbyte.',
    },
    searchText: 'GitHub repositories projects onurbyte embed',
  },
  {
    url: '/#spotify-embed',
    meta: {
      title: 'Spotify listening',
      description: 'Current and recent listening.',
    },
    searchText: 'Spotify music listening tracks embed',
  },
];

export const searchEntries = [
  ...homeEmbedEntries,
  ...searchPages.map((page) => ({
    ...page,
    searchText: `${page.meta.title} ${page.meta.description}`,
  })),
  ...logSearchEntries(logEntries),
];

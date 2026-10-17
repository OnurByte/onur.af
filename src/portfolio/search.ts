import { logEntries, type LogEntry } from './log';
import { buildContentIndex } from './content-index';
import pages from '../content/public-pages.json' with { type: 'json' };

// Fixed public metadata only: never crawl checkout URLs or payment data.
export const searchPages = pages.map(({ id, title, description }) => ({
  url: id,
  meta: { title, description },
}));

export function logSearchEntries(entries: readonly LogEntry[]) {
  return buildContentIndex(entries).documents.map((document) => ({
    url: document.url,
    meta: { title: document.title, description: document.summary },
    searchText: [
      document.title,
      document.summary,
      ...document.tags,
      document.body,
      ...document.links,
      ...document.sources.map((source) => source.title),
      ...document.repositories.map((reference) => reference.repository),
    ].join(' '),
  }));
}
const homeEmbedEntries = [
  {
    url: '/#embed-x',
    meta: { title: '𝕏', description: 'Recent posts from @onurstirner.' },
    searchText: 'X posts Twitter @onurstirner embed',
  },
  {
    url: '/#embed-github',
    meta: {
      title: 'GitHub',
      description: 'Recent repositories from onurbyte.',
    },
    searchText: 'GitHub repositories projects onurbyte embed',
  },
  {
    url: '/#spotify-embed',
    meta: {
      title: 'Spotify',
      description: 'Recent tracks and current listening.',
    },
    searchText: 'Spotify recents recent tracks history music listening embed',
  },
];

const searchPageEntries = searchPages.map((page) => ({
  ...page,
  searchText: `${page.meta.title} ${page.meta.description}`,
}));

export const searchLogEntries = logSearchEntries(logEntries);
export const searchPrimaryEntries = [...searchPageEntries, ...homeEmbedEntries];
// Keep the complete index for consumers that need all searchable entries.
export const searchEntries = [
  ...searchPageEntries,
  ...searchLogEntries,
  ...homeEmbedEntries,
];

import { expect, test } from 'bun:test';
import {
  parseLog,
  logFeedEntries,
  revisionMarkdown,
  getLogEntryById,
  listedLogEntries,
  logUrl,
  logProofUrl,
} from '../src/portfolio/log';
import { introductionEntry } from '../src/portfolio/introduction';
import { contentIndex } from '../src/portfolio/content-index';
import { logSearchEntries } from '../src/portfolio/search';
import { logTags } from '../src/portfolio/log-tags';
import { logConnections } from '../src/portfolio/log-connections';
import { sitemapXml, robotsContent } from '../src/portfolio/seo';

const note = {
  id: 'silent-lodge-convenes',
  title: 'Visible note',
  summary: 'A note.',
  revisions: [
    {
      version: 1,
      publishedAt: '2026-10-19T10:00:00Z',
      tags: ['development'],
      body: 'A note.',
    },
  ],
};

test('unlisted entries are excluded from discovery, while absent visibility remains public', () => {
  const entries = parseLog([
    note,
    { ...note, id: 'hidden-temple-waits', visibility: 'unlisted' },
  ]);
  expect(logFeedEntries(entries).map((entry) => entry.url)).toEqual([
    '/log/silent-lodge-convenes',
  ]);

  expect(
    logSearchEntries(entries).some((entry) =>
      entry.url.includes('hidden-temple-waits'),
    ),
  ).toBe(false);
  expect(
    logTags(entries).every((tag) =>
      tag.entries.every((entry) => entry.visibility !== 'unlisted'),
    ),
  ).toBe(true);
  expect(
    logConnections(
      entries.find((entry) => entry.id === note.id)!,
      entries,
      undefined,
      [{ from: note.id, to: 'hidden-temple-waits', reason: 'Hidden target' }],
    ).related,
  ).toEqual([]);
});

test('visibility changes preserve signed revision bytes and reject unknown policies', () => {
  const listed = parseLog([note])[0]!;
  const unlisted = parseLog([{ ...note, visibility: 'unlisted' }])[0]!;
  expect(revisionMarkdown(unlisted, 1)).toBe(revisionMarkdown(listed, 1));
  expect(() => parseLog([{ ...note, visibility: 'private' }])).toThrow();
});

test('the home introduction is unlisted, reachable by ID, and omitted from the sitemap', () => {
  expect(introductionEntry.visibility).toBe('unlisted');
  expect(
    contentIndex.documents.some((entry) => entry.id === introductionEntry.id),
  ).toBe(false);
  expect(getLogEntryById(introductionEntry.id)).toBeDefined();
  expect(
    listedLogEntries.some((entry) => entry.id === introductionEntry.id),
  ).toBe(false);
  expect(sitemapXml('https://portfolio.example')).not.toContain(
    introductionEntry.id,
  );
  expect(robotsContent(logUrl(introductionEntry))).toBe('noindex, follow');
  expect(robotsContent(logProofUrl(introductionEntry))).toBe('noindex, follow');
});

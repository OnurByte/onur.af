import { expect, test } from 'bun:test';
import { logTags } from '../src/portfolio/log-tags';
import { logSearchEntries } from '../src/portfolio/search';
import { logConnections } from '../src/portfolio/log-connections';
import type { LogEntry } from '../src/portfolio/log';
const note = (id: string, tags: string[]): LogEntry => ({
  id,
  title: id,
  summary: 'Note',
  revisions: [
    { version: 1, publishedAt: '2026-10-18T00:00:00Z', tags, body: 'Text' },
  ],
});
test('broader subjects include narrower records without adding signed tags', () => {
  const entry = note('silent-lodge-convenes', ['pgp']);
  const subjects = logTags([entry]);
  expect(subjects.find((s) => s.slug === 'cryptography')?.entries).toEqual([
    entry,
  ]);
  expect(entry.revisions[0]!.tags).toEqual(['pgp']);
});
test('Find indexes subject aliases and subject landing pages', () => {
  const results = logSearchEntries([note('silent-lodge-convenes', ['pgp'])]);
  expect(
    results.find((r) => r.url === '/log/silent-lodge-convenes')?.searchText,
  ).toContain('GPG');
  expect(results.find((r) => r.url === '/log/tag/pgp')?.searchText).toContain(
    'OpenPGP',
  );
});
test('sharing a subject alone is not an editorial connection', () => {
  const entries = [
    note('silent-lodge-convenes', ['pgp']),
    note('ancient-archive-opens', ['pgp']),
  ];
  expect(logConnections(entries[0]!, entries).related).toEqual([]);
});

test('editorial connections reject missing targets, self links, empty reasons and duplicates', () => {
  const entries = [
    note('silent-lodge-convenes', []),
    note('ancient-archive-opens', []),
  ];
  const from = entries[0]!.id;
  const to = entries[1]!.id;
  for (const paths of [
    [{ from, to: 'missing-log-here', reason: 'Context' }],
    [{ from, to: from, reason: 'Context' }],
    [{ from, to, reason: '  ' }],
    [
      { from, to, reason: 'Context' },
      { from, to, reason: 'Again' },
    ],
  ])
    expect(() =>
      logConnections(entries[0]!, entries, undefined, paths),
    ).toThrow();
});

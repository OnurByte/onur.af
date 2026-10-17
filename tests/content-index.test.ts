import { expect, test } from 'bun:test';
import {
  buildContentIndex,
  githubReference,
} from '../src/portfolio/content-index';
import type { LogEntry } from '../src/portfolio/log';

const entry = (id: string, body: string): LogEntry => ({
  id,
  title: id,
  summary: 'Summary',
  revisions: [
    {
      version: 1,
      publishedAt: '2026-10-15T09:00:00Z',
      body,
      tags: ['development'],
    },
  ],
});

test('GitHub references require the exact public host and retain pinned commits', () => {
  expect(
    githubReference(
      'https://github.com/OnurByte/portfolio/commit/' + 'a'.repeat(40),
    ),
  ).toEqual({
    repository: 'onurbyte/portfolio',
    url: 'https://github.com/OnurByte/portfolio/commit/' + 'a'.repeat(40),
    commit: 'a'.repeat(40),
  });
  for (const url of [
    'https://github.com.evil.test/a/b',
    'https://x@github.com/a/b',
    'https://github.com/a',
    'https://github.com/settings/profile',
  ])
    expect(githubReference(url)).toBeUndefined();
});

test('one index resolves relative links, sources, backlinks and repository lookup', () => {
  const first = entry(
    'sealed-council-convenes',
    '[next](./quiet-river-flows#note) [code](https://github.com/OnurByte/portfolio/blob/' +
      'a'.repeat(40) +
      '/src/index.ts)',
  );
  first.revisions[0]!.sources = [
    { title: 'Reference', url: 'https://example.com/research' },
  ];
  const second = entry('quiet-river-flows', 'Current');
  const index = buildContentIndex([first, second], 'https://onur.example');
  expect(index.documents[0]!.links).toContain(
    'https://onur.example/log/quiet-river-flows#note',
  );
  expect(index.documents[0]!.externalLinks).toContain(
    'https://example.com/research',
  );
  expect(index.referencedBy(second.id).map((item) => item.id)).toEqual([
    first.id,
  ]);
  expect(
    index.forRepository('ONURBYTE/PORTFOLIO').map((item) => item.id),
  ).toEqual([first.id]);
  expect(index.documents[0]!.repositories[0]!.commit).toBe('a'.repeat(40));
});

test('old revision links never leak into the current derived index', () => {
  const first = entry(
    'sealed-council-convenes',
    '[old](https://github.com/old/repository)',
  );
  first.revisions.push({
    version: 2,
    publishedAt: '2026-10-16T09:00:00Z',
    body: 'Latest',
    tags: ['development'],
  });
  const before = JSON.stringify(first);
  const index = buildContentIndex([first]);
  expect(index.documents[0]!.repositories).toEqual([]);
  expect(index.documents[0]!.body).toBe('Latest');
  expect(JSON.stringify(first)).toBe(before);
});

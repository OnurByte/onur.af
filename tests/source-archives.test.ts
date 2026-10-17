import { expect, test } from 'bun:test';
import {
  archiveForSource,
  parseSourceArchives,
  sourceUrls,
} from '../src/portfolio/source-archives';
import { revisionMarkdown, type LogEntry } from '../src/portfolio/log';
const entry: LogEntry = {
  id: 'quiet-river-flows',
  title: 'Note',
  summary: 'Summary',
  revisions: [
    {
      version: 1,
      publishedAt: '2026-10-17T00:00:00Z',
      tags: ['development'],
      body: '[Paper](https://example.com/paper)',
      sources: [{ title: 'Reference', url: 'https://example.com/source' }],
    },
  ],
};

test('archive relationships remain separate from immutable signed content', () => {
  const before = revisionMarkdown(entry, 1);
  const store = parseSourceArchives(
    {
      'https://example.com/source': {
        url: 'https://archive.example/capture/123',
        capturedAt: '2026-10-17T00:00:00Z',
      },
    },
    [entry],
  );
  expect(store['https://example.com/source']!.url).toBe(
    'https://archive.example/capture/123',
  );
  expect(revisionMarkdown(entry, 1)).toBe(before);
  expect(sourceUrls([entry])).toEqual([
    'https://example.com/paper',
    'https://example.com/source',
  ]);
});

test('unrelated and unsafe archive mappings cannot enter public source output', () => {
  expect(() =>
    parseSourceArchives(
      {
        'https://unrelated.example/': {
          url: 'https://archive.example/capture',
          capturedAt: '2026-10-17T00:00:00Z',
        },
      },
      [entry],
    ),
  ).toThrow();
  expect(() =>
    parseSourceArchives(
      {
        'https://example.com/source': {
          url: 'javascript:alert(1)',
          capturedAt: '2026-10-17T00:00:00Z',
        },
      },
      [entry],
    ),
  ).toThrow();
});

test('archive lookup uses normalized URL without changing signed citation', () => {
  const store = {
    'https://example.com/': {
      url: 'https://archive.example/123',
      capturedAt: '2026-10-17T00:00:00Z',
    },
  };
  expect(archiveForSource('https://EXAMPLE.com', store)?.url).toBe(
    'https://archive.example/123',
  );
});

test('archive import normalizes original URL keys and rejects ambiguous duplicate captures', () => {
  const withSource = {
    ...entry,
    revisions: [
      {
        ...entry.revisions[0]!,
        sources: [{ title: 'Reference', url: 'https://EXAMPLE.com' }],
      },
    ],
  };
  const capture = {
    url: 'https://archive.example/123',
    capturedAt: '2026-10-17T00:00:00Z',
  };
  const store = parseSourceArchives({ 'https://EXAMPLE.com': capture }, [
    withSource,
  ]);
  expect(archiveForSource('https://EXAMPLE.com', store)).toEqual(capture);
  expect(() =>
    parseSourceArchives(
      { 'https://EXAMPLE.com': capture, 'https://example.com/': capture },
      [withSource],
    ),
  ).toThrow('Duplicate');
});

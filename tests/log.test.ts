import { expect, test } from 'bun:test';
import {
  parseLog,
  revisionMarkdown,
  readingTime,
  logFeedEntries,
} from '../src/portfolio/log';
import { renderLogMarkdown } from '../src/portfolio/log-markdown';

const revision = {
  version: 1,
  publishedAt: '2026-10-15T09:00:00Z',
  body: 'A small public note.',
};
const entry = {
  id: 'small-note',
  title: 'Small note',
  summary: 'A public note.',
  revisions: [revision],
};

test('log retains immutable revisions, sorts publications, and uses stable fragment URLs in RSS', () => {
  const entries = parseLog([
    {
      ...entry,
      revisions: [
        revision,
        {
          ...revision,
          version: 2,
          publishedAt: '2026-10-16T09:00:00Z',
          body: 'A corrected public note.',
        },
      ],
    },
  ]);
  expect(entries[0]!.revisions).toHaveLength(2);
  expect(logFeedEntries(entries)[0]).toMatchObject({
    id: 'log-small-note',
    url: '/log/small-note',
    publishedAt: revision.publishedAt,
  });
  expect(revisionMarkdown(entries[0]!, 1)).toContain('A small public note.');
  expect(revisionMarkdown(entries[0]!, 1)).not.toContain('corrected');
  expect(revisionMarkdown(entries[0]!, 2)).toContain('version: 2');
  expect(() => revisionMarkdown(entries[0]!, 3)).toThrow();
});

test('rejects duplicate IDs, missing or reordered revisions and backwards timestamps', () => {
  expect(() => parseLog([entry, entry])).toThrow();
  expect(() => parseLog([{ ...entry, revisions: [] }])).toThrow();
  expect(() =>
    parseLog([{ ...entry, revisions: [{ ...revision, version: 2 }] }]),
  ).toThrow();
  expect(() =>
    parseLog([
      {
        ...entry,
        revisions: [
          revision,
          { ...revision, version: 2, publishedAt: '2026-10-14T09:00:00Z' },
        ],
      },
    ]),
  ).toThrow();
});

test('reading estimates exclude Markdown syntax and weight code separately', () => {
  expect(readingTime('Hello world')).toBe('5 sec read');
  expect(readingTime('word '.repeat(480))).toBe('2 min read');
  expect(readingTime('```ts\n' + 'line();\n'.repeat(20) + '```')).toBe(
    '40 sec read',
  );
});

test('renders Markdown while blocking raw HTML and executable URLs', () => {
  const html = renderLogMarkdown(
    '**Hello**\n\n<script>alert(1)</script>\n\n[bad](javascript:alert%281%29)',
  );
  expect(html).toContain('<strong>Hello</strong>');
  expect(html).not.toContain('<script>');
  expect(html).not.toContain('href="javascript:');
});

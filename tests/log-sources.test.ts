import { expect, test } from 'bun:test';
import { logMetadata, parseLog, revisionMarkdown } from '../src/portfolio/log';
import { logConnections } from '../src/portfolio/log-connections';
const revision = {
  version: 1,
  publishedAt: '2026-10-16T09:00:00Z',
  body: 'A note.',
};
const entry = {
  id: 'silent-lodge-convenes',
  title: 'A note',
  summary: 'Summary',
  revisions: [revision],
};

test('sources are optional and new revision sources do not alter old signed bytes', () => {
  const original = parseLog([entry])[0]!;
  expect(logMetadata(original).sources).toEqual([]);
  const signed = revisionMarkdown(original, 1);
  const sources = [
    { title: 'Protocol specification', url: 'https://example.com/spec' },
  ];
  const updated = parseLog([
    {
      ...entry,
      revisions: [
        revision,
        {
          ...revision,
          version: 2,
          publishedAt: '2026-10-17T09:00:00Z',
          sources,
        },
      ],
    },
  ])[0]!;
  expect(logMetadata(updated).sources).toEqual(sources);
  expect(logMetadata(updated, 1).sources).toEqual([]);
  expect(revisionMarkdown(updated, 1)).toBe(signed);
  expect(revisionMarkdown(updated, 2)).toContain(
    'sources: [{"title":"Protocol specification","url":"https://example.com/spec"}]',
  );
  const empty = parseLog([
    { ...entry, revisions: [{ ...revision, sources: [] }] },
  ])[0]!;
  expect(logMetadata(empty).sources).toEqual([]);
});

test('source links reject unsafe URLs and missing titles while supporting web/local references', () => {
  for (const source of [
    { title: '', url: 'https://example.com' },
    { title: 'Unsafe', url: 'javascript:alert(1)' },
    { title: 'Unsafe', url: '//evil.example' },
    { title: 'Unsafe', url: 'https://user:pass@example.com' },
    { title: 'Unsafe', url: '/\\evil.example' },
  ])
    expect(() =>
      parseLog([{ ...entry, revisions: [{ ...revision, sources: [source] }] }]),
    ).toThrow();
  expect(
    parseLog([
      {
        ...entry,
        revisions: [
          {
            ...revision,
            sources: [
              { title: 'Web', url: 'http://example.com/spec' },
              { title: 'Local', url: '/pgp' },
            ],
          },
        ],
      },
    ]),
  ).toHaveLength(1);
});

test('local source references participate in link validation and backlinks', () => {
  expect(() =>
    parseLog([
      {
        ...entry,
        revisions: [
          {
            ...revision,
            sources: [{ title: 'Missing', url: '/log/missing-entry-here' }],
          },
        ],
      },
    ]),
  ).toThrow('Unknown Log link');
  const entries = parseLog([
    entry,
    {
      ...entry,
      id: 'ancient-archive-opens',
      revisions: [
        {
          ...revision,
          sources: [{ title: 'Cited note', url: '/log/silent-lodge-convenes' }],
        },
      ],
    },
  ]);
  expect(
    logConnections(
      entries.find((item) => item.id === entry.id)!,
      entries,
    ).referencedBy.map((item) => item.id),
  ).toEqual(['ancient-archive-opens']);
});

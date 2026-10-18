import { expect, test } from 'bun:test';
import { parseLog } from '../src/portfolio/log';
import { logConnections } from '../src/portfolio/log-connections';
const entry = (
  id: string,
  tags: string[],
  body = 'Text',
  publishedAt = '2026-10-16T09:00:00Z',
) => ({
  id,
  title: id,
  summary: 'A note',
  revisions: [{ version: 1, publishedAt, tags, body }],
});

test('editorial reading paths follow author order and include a reason', () => {
  const entries = parseLog([
    entry('silent-lodge-convenes', ['pgp', 'privacy']),
    entry(
      'ancient-archive-opens',
      ['pgp', 'privacy'],
      'Both',
      '2026-10-10T09:00:00Z',
    ),
    entry('veiled-compass-turns', ['pgp'], 'Newer', '2026-10-15T09:00:00Z'),
    entry('hidden-temple-waits', ['privacy'], 'Older', '2026-10-14T09:00:00Z'),
    entry('quiet-council-meets', ['pgp'], 'Oldest', '2026-10-13T09:00:00Z'),
    entry('sacred-ritual-begins', ['web']),
  ]);
  const main = entries.find((item) => item.id === 'silent-lodge-convenes')!;
  expect(
    logConnections(main, entries, undefined, [
      { from: main.id, to: 'ancient-archive-opens', reason: 'Background' },
      { from: main.id, to: 'veiled-compass-turns', reason: 'An application' },
      {
        from: main.id,
        to: 'hidden-temple-waits',
        reason: 'A different perspective',
      },
    ]).related.map((entry) => entry.id),
  ).toEqual([
    'ancient-archive-opens',
    'veiled-compass-turns',
    'hidden-temple-waits',
  ]);
});

test('backlinks use current Markdown links, deduplicate and exclude external lookalikes and code', () => {
  const main = entry('silent-lodge-convenes', []);
  const entries = parseLog([
    main,
    entry(
      'ancient-archive-opens',
      [],
      '[One](/log/silent-lodge-convenes#details) and [two](/log/silent-lodge-convenes?v=1)',
    ),
    entry(
      'veiled-compass-turns',
      [],
      '[Absolute](https://portfolio.example/log/silent-lodge-convenes)',
    ),
    entry(
      'hidden-temple-waits',
      [],
      '[External](https://evil.example/log/silent-lodge-convenes)',
    ),
    entry('quiet-council-meets', [], '`[Code](/log/silent-lodge-convenes)`'),
    {
      ...entry('sacred-ritual-begins', [], '[Old](/log/silent-lodge-convenes)'),
      revisions: [
        entry('sacred-ritual-begins', [], '[Old](/log/silent-lodge-convenes)')
          .revisions[0],
        {
          version: 2,
          publishedAt: '2026-10-17T09:00:00Z',
          tags: [],
          body: 'Removed link',
        },
      ],
    },
  ]);
  expect(
    logConnections(
      entries.find((item) => item.id === main.id)!,
      entries,
      'https://portfolio.example',
    ).referencedBy.map((entry) => entry.id),
  ).toEqual(['ancient-archive-opens', 'veiled-compass-turns']);
});

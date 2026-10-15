import { expect, test } from 'bun:test';
import { loadEmbeds, type EmbedSource } from '../src/portfolio/embed-sources';

const metadata = {
  id: 'music',
  title: 'Listening',
  source: 'Music',
  href: 'https://music.example',
};
const snapshot = {
  status: 'ready',
  items: [
    { kind: 'track', title: 'Track', href: 'https://music.example/track' },
  ],
};
test('empty registry does no work', async () =>
  expect(await loadEmbeds([])).toEqual([]));
test('sources load independently, validate output and preserve registry order', async () => {
  const sources: EmbedSource[] = [
    {
      ...metadata,
      load: async () => {
        throw new Error('private token');
      },
    },
    {
      ...metadata,
      id: 'posts',
      load: async () => ({ ...snapshot, html: '<script>' }),
    },
    { ...metadata, id: 'working', load: async () => snapshot },
  ];
  const result = await loadEmbeds(sources);
  expect(result.map((section) => section.id)).toEqual([
    'music',
    'posts',
    'working',
  ]);
  expect(result.map((section) => section.status)).toEqual([
    'unavailable',
    'unavailable',
    'ready',
  ]);
  expect(JSON.stringify(result)).not.toContain('private token');
});
test('a stalled source is aborted and cannot block the page', async () => {
  let signal: AbortSignal | undefined;
  const result = await loadEmbeds(
    [
      {
        ...metadata,
        load: (input) => {
          signal = input;
          return new Promise(() => {});
        },
      },
    ],
    { timeoutMs: 5 },
  );
  expect(result[0]?.status).toBe('unavailable');
  expect(signal?.aborted).toBe(true);
});
test('duplicate identities and invalid metadata fail before invoking adapters', async () => {
  let calls = 0;
  const source = {
    ...metadata,
    load: async () => {
      calls++;
      return snapshot;
    },
  };
  expect(loadEmbeds([source, source])).rejects.toThrow();
  expect(loadEmbeds([{ ...source, href: 'javascript:bad' }])).rejects.toThrow();
  expect(calls).toBe(0);
});

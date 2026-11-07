import { fromHtml } from 'hast-util-from-html';
import { visit } from 'unist-util-visit';
import { unified } from 'unified';
import rehypeStringify from 'rehype-stringify';
import {
  projectionText,
  revisionProjection,
} from '../src/portfolio/text-projection';
import { test, expect } from 'bun:test';
import {
  selectMemento,
  timegateResponse,
  mementoResponse,
  validateSnapshot,
  createSnapshot,
  timeMap,
} from '../src/portfolio/memento';
import { logEntries } from '../src/portfolio/log';
const entry = logEntries[0];
if (!entry) throw new Error('Missing fixture');
const snapshot = await createSnapshot(
  entry,
  1,
  revisionProjection(entry, 1),
  '2026-10-29T14:00:00.000Z',
  'reconstructed',
  () => Promise.reject(new Error('unexpected asset')),
);
const second = {
  ...snapshot,
  version: 2,
  archivedAt: '2026-10-29T14:01:00.000Z',
};
test('time negotiation selects latest captured state no later than request', () => {
  expect(
    selectMemento([snapshot, second], 'Thu, 29 Oct 2026 14:00:59 GMT')?.version,
  ).toBe(1);
  expect(
    selectMemento([snapshot, second], 'Thu, 29 Oct 2026 14:01:00 GMT')?.version,
  ).toBe(2);
  expect(selectMemento([snapshot], 'Thu, 29 Oct 2026 13:59:59 GMT')).toBeNull();
  for (const date of [
    'bad',
    '2026-10-29',
    'Thu, 29 Oct 2026 17:00:00 +0300',
    'Fri, 29 Oct 2026 14:00:00 GMT',
  ])
    expect(() => selectMemento([snapshot], date)).toThrow();
});
test('GET and HEAD use same selection with safe cache and discovery headers', () => {
  const headers = { 'Accept-Datetime': 'Thu, 29 Oct 2026 14:00:00 GMT' };
  for (const method of ['GET', 'HEAD']) {
    const r = timegateResponse(
      new Request('https://onur.af/log/a/timegate', { method, headers }),
      entry.id,
      [snapshot],
    );
    expect(r.status).toBe(302);
    expect(r.headers.get('vary')).toBe('Accept-Datetime');
    expect(r.headers.get('location')).toContain('/memento/v1');
    expect(r.headers.get('cache-control')).toBe('no-store');
  }
  expect(
    timegateResponse(
      new Request('https://onur.af', { headers: { 'Accept-Datetime': 'bad' } }),
      entry.id,
      [snapshot],
    ).status,
  ).toBe(400);
});
test('snapshot HTML is standalone, byte immutable and not a current revision composite', async () => {
  const r = mementoResponse(
    new Request('https://onur.af', { headers: { 'Accept-Datetime': 'bad' } }),
    snapshot,
    'https://onur.af',
  );
  expect(await r.text()).toBe(snapshot.html);
  expect(r.headers.get('memento-datetime')).toBe(
    'Thu, 29 Oct 2026 14:00:00 GMT',
  );
  expect(r.headers.get('link')).toContain('rel="original"');
  expect(snapshot.html).toContain('Reconstructed revision');
  expect(snapshot.html).not.toContain('<script');
  expect(() =>
    validateSnapshot({ ...snapshot, html: snapshot.html + 'x' }),
  ).toThrow();
  expect(timeMap(entry.id, [snapshot], 'https://onur.af')).toContain(
    'datetime="Thu, 29 Oct 2026 14:00:00 GMT"',
  );
});

test('cached historical body resolves the exact annotation source fragment and offsets', () => {
  const id = `${entry.id}-v1-body`;
  let text: string | undefined;
  visit(fromHtml(snapshot.html), 'element', (node) => {
    if (node.properties.id === id)
      text = projectionText(
        unified()
          .use(rehypeStringify)
          .stringify({ type: 'root', children: [node] }),
      );
  });
  expect(text).toBe(revisionProjection(entry, 1).text);
});

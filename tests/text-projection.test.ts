import { test, expect } from 'bun:test';
import {
  createProjection,
  validateProjection,
  projectionText,
  revisionProjection,
} from '../src/portfolio/text-projection';
import { logEntries, revisionMarkdown } from '../src/portfolio/log';
import { createHash } from 'node:crypto';
import { renderLogContent } from '../src/portfolio/log-markdown';
import {
  anchorSelection,
  resolveSelection,
} from '../src/portfolio/annotations/protocol';

test('frozen projection matches all rendering paths without normalizing UTF-16', () => {
  const body =
    '# İstanbul 😀\n\ne\u0301 Türkçe مرحبا [link](https://example.org) [1]\n\n$x^2$ foot[^a]\n\n[^a]: Repeat.\n\nRepeat. Repeat.';
  const p = createProjection('a'.repeat(64), body, 'one-two-three', 1, 1);
  expect(p.text).toBe(projectionText(p.render.html));
  expect(p.text).toBe(projectionText(p.archivedRender.html));
  expect(p.text).toBe(projectionText(renderLogContent(body, '', 0).html));
  const start = p.text.indexOf('😀');
  expect(
    resolveSelection(p.text, anchorSelection(p.text, start, start + 2)),
  ).toEqual({ start, end: start + 2 });
  expect(p.projectionHash).toBe(
    createHash('sha256').update(p.text).digest('hex'),
  );
  expect(validateProjection(JSON.parse(JSON.stringify(p)))).toEqual(p);
});
test('projection rejects altered text, render markup, or identity', () => {
  const p = createProjection('a'.repeat(64), 'Hello', 'one-two-three', 1, 0);
  for (const patch of [
    { text: 'Other' },
    { render: { ...p.render, html: '<p>Other</p>' } },
    { projectionHash: 'b'.repeat(64) },
  ])
    expect(() => validateProjection({ ...p, ...patch })).toThrow();
});
test('every published revision has a frozen projection bound to exact signed bytes', () => {
  for (const entry of logEntries)
    for (const revision of entry.revisions) {
      const p = revisionProjection(entry, revision.version);
      expect(p.revisionHash).toBe(
        createHash('sha256')
          .update(revisionMarkdown(entry, revision.version))
          .digest('hex'),
      );
      expect(projectionText(p.render.html)).toBe(p.text);
    }
});

import { expect, test } from 'bun:test';
import { parseLog } from '../src/portfolio/log';
import { logRevisionDiff } from '../src/portfolio/log-diff';

test('revision diffs expose signed metadata and body changes with bounded context', () => {
  const stable = Array.from({ length: 30 }, (_, i) => `Stable line ${i}`).join(
    '\n',
  );
  const entry = parseLog([
    {
      id: 'silent-lodge-convenes',
      title: 'Title',
      summary: 'Summary',
      revisions: [
        {
          version: 1,
          publishedAt: '2026-10-15T09:00:00Z',
          tags: ['pgp'],
          body: `${stable}\nOld claim\n`,
        },
        {
          version: 2,
          publishedAt: '2026-10-16T09:00:00Z',
          title: 'Revised title',
          tags: ['pgp', 'privacy'],
          body: `${stable}\nCorrected claim <script>alert(1)</script>\n`,
        },
      ],
    },
  ])[0]!;
  const result = logRevisionDiff(entry, 2);
  const lines = result.hunks.flatMap((hunk) => hunk.lines);
  expect(lines).toContain('-Old claim');
  expect(lines).toContain('+Corrected claim <script>alert(1)</script>');
  expect(lines).toContain('+title: "Revised title"');
  expect(lines).toContain('+tags: ["pgp","privacy"]');
  expect(lines).not.toContain(' Stable line 15');
  expect(result.added).toBeGreaterThan(0);
  expect(result.removed).toBeGreaterThan(0);
  expect(logRevisionDiff(entry, 1).hunks).toEqual([]);
  expect(() => logRevisionDiff(entry, 99)).toThrow('Unknown');
});

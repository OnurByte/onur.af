import { expect, test } from 'bun:test';
import { selectionOutline } from '../src/portfolio/selection-outline';
test('wrapped selection produces a single connected rounded outline', () => {
  const path = selectionOutline(
    [
      { left: 10, right: 200, top: 10, bottom: 30 },
      { left: 10, right: 150, top: 42, bottom: 62 },
    ],
    8,
  );
  expect(path.match(/M/g)).toHaveLength(1);
  expect(path).toContain('Q');
  expect(path.endsWith('Z')).toBe(true);
});
test('empty selections have no outline and adjacent inline fragments merge', () => {
  expect(selectionOutline([], 8)).toBe('');
  expect(
    selectionOutline(
      [
        { left: 0, right: 100, top: 0, bottom: 20 },
        { left: 100, right: 200, top: 0, bottom: 20 },
      ],
      8,
    ).match(/M/g),
  ).toHaveLength(1);
});

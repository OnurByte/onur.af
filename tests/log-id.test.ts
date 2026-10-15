import { expect, test } from 'bun:test';
import {
  adjectives,
  generateLogId,
  subjects,
} from '../src/portfolio/log-id';

test('generates three-word grammatical Masonic permalinks', () => {
  const slug = generateLogId(new Set(), () => 0);
  expect(slug).toBe('ancient-archive-opens');
  expect(slug).toMatch(/^[a-z]+-[a-z]+-[a-z]+$/);
  expect(adjectives.length * subjects.length * 3).toBeGreaterThan(1000);
});

test('retries reserved URL identifiers without reusing an existing ID', () => {
  const picks = [0, 0, 0, 0, 1, 0];
  let index = 0;
  expect(
    generateLogId(new Set(['ancient-archive-opens']), () => picks[index++]!),
  ).toBe('ancient-bell-tolls');
  expect(index).toBe(6);
});

test('fails closed if the random source cannot produce a new slug', () => {
  expect(() =>
    generateLogId(new Set(['ancient-archive-opens']), () => 0),
  ).toThrow('Unable to generate an unused Log ID');
});

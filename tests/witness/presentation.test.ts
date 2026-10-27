import { expect, test } from 'bun:test';
import { viewCountLabel } from '../../src/portfolio/witness/presentation';
test('local Log counters display a dash with the views label, production uses recorded totals', () => {
  expect(viewCountLabel('localhost', { status: 'available', count: 12 })).toBe(
    '- views',
  );
  expect(viewCountLabel('127.0.0.1', { status: 'disabled' })).toBe('- views');
  expect(viewCountLabel('[::1]', { status: 'available', count: 0 })).toBe(
    '- views',
  );
  expect(viewCountLabel('onur.af', { status: 'disabled' })).toBe('0 views');
  expect(viewCountLabel('onur.af', { status: 'available', count: 0 })).toBe(
    '0 views',
  );
  expect(viewCountLabel('onur.af', { status: 'available', count: 1284 })).toBe(
    '1,284 views',
  );
  expect(viewCountLabel('onur.af', { status: 'unavailable' })).toBe('- views');
});

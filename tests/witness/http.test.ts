import { expect, test } from 'bun:test';
import { parseVisit, periodDays } from '../../src/server/witness/http';
test('visit validation requires consent and limits input', () => {
  const input = {
    logId: 'example',
    revision: 1,
    visitorId: 'abcd',
    generation: 'fpjs-5.3.0',
    requestToken: 'a'.repeat(64),
    consent: true,
  };
  expect(parseVisit(input).logId).toBe('example');
  expect(() => parseVisit({ ...input, consent: false })).toThrow();
  expect(() => parseVisit({ ...input, visitorId: 'a'.repeat(257) })).toThrow();
  expect(() => parseVisit({ ...input, revision: 1.5 })).toThrow();
  expect(periodDays('all')).toBeNull();
  expect(periodDays('7')).toBe(7);
  expect(periodDays('garbage')).toBe(30);
});

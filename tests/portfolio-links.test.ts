import { describe, expect, test } from 'bun:test';
import { validPortfolioUrl } from '../src/portfolio/links';

describe('portfolio footer URL validation', () => {
  test('accepts only the intended endpoint forms', () => {
    expect(validPortfolioUrl('TOR', 'http://example.onion')).toBe('http://example.onion/');
    expect(validPortfolioUrl('I2P', 'https://example.i2p/path')).toBe('https://example.i2p/path');
    expect(validPortfolioUrl('PGP', 'https://example.com/key.asc')).toBe('https://example.com/key.asc');
    expect(validPortfolioUrl('PGP', '/keys/pgp.asc')).toBe('/keys/pgp.asc');
  });

  test('omits malformed, mismatched, credentialed, or protocol-relative values', () => {
    for (const input of ['javascript:alert(1)', 'https://example.com', 'http://example.i2p.evil', 'http://user:pass@example.onion', '//evil.test', '/\\evil.test', '/path\n']) {
      expect(validPortfolioUrl('TOR', input)).toBeUndefined();
    }
    expect(validPortfolioUrl('I2P', 'https://example.onion')).toBeUndefined();
    expect(validPortfolioUrl('PGP', 'http://example.com/key')).toBeUndefined();
    expect(validPortfolioUrl('PGP', '//example.com/key')).toBeUndefined();
  });
});

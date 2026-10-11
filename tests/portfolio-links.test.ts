import { describe, expect, test } from 'bun:test';
import { portfolioLinks, validPortfolioUrl } from '../src/portfolio/links';

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

  test('keeps every label when URLs are blank or invalid', () => {
    const keys = ['PORTFOLIO_TOR_URL', 'PORTFOLIO_I2P_URL', 'PORTFOLIO_PGP_URL'] as const;
    const previous = keys.map(key => process.env[key]);
    try {
      keys.forEach(key => { process.env[key] = ''; });
      expect(portfolioLinks()).toEqual([
        { label: 'TOR', href: undefined },
        { label: 'I2P', href: undefined },
        { label: 'PGP', href: undefined },
      ]);
      process.env.PORTFOLIO_TOR_URL = 'https://example.onion';
      process.env.PORTFOLIO_I2P_URL = 'http://example.i2p/path';
      process.env.PORTFOLIO_PGP_URL = '/keys/pgp.asc';
      expect(portfolioLinks()).toEqual([
        { label: 'TOR', href: 'https://example.onion/' },
        { label: 'I2P', href: 'http://example.i2p/path' },
        { label: 'PGP', href: '/keys/pgp.asc' },
      ]);
    } finally {
      keys.forEach((key, index) => {
        if (previous[index] === undefined) delete process.env[key];
        else process.env[key] = previous[index];
      });
    }
  });
});

import { describe, expect, test } from 'bun:test';
import {
  canonicalUrl,
  sitemapXml,
  validSiteUrl,
  publicPaths,
  proofPaths,
  logPaths,
} from '../src/portfolio/seo';

describe('public SEO URLs', () => {
  test('accepts an explicit HTTP(S) origin only', () => {
    expect(validSiteUrl('https://portfolio.example/')).toBe(
      'https://portfolio.example',
    );
    expect(validSiteUrl('http://portfolio.example')).toBe(
      'http://portfolio.example',
    );
    for (const value of [
      undefined,
      '',
      'javascript:alert(1)',
      '//evil.example',
      'https://user:pass@example.com',
      'https://example.com/path',
      'https://example.com?x=1',
      'https://example.com/#fragment',
      'http://localhost:4321',
      'http://127.0.0.1',
      'http://[::1]',
      'https://example.com\n',
    ]) {
      expect(validSiteUrl(value)).toBeUndefined();
    }
  });

  test('only publishes canonical public pages', () => {
    expect(canonicalUrl('https://portfolio.example', '/')).toBe(
      'https://portfolio.example/',
    );
    expect(canonicalUrl('https://portfolio.example', '/donate')).toBe(
      'https://portfolio.example/donate',
    );
    for (const path of [
      '/donate/private-id',
      '/identity',
      '//evil.example',
      '/unknown',
    ]) {
      expect(canonicalUrl('https://portfolio.example', path)).toBeUndefined();
    }
    for (const path of [...publicPaths, ...proofPaths, ...logPaths()]) {
      expect(canonicalUrl('https://portfolio.example', path)).toBe(
        `https://portfolio.example${path}`,
      );
    }
    expect(logPaths()).toContain('/log/midnight-lodge-convenes');
    expect(logPaths()).toContain('/pgp/log/midnight-lodge-convenes');
    expect(logPaths()).not.toContain('/log/hello-world');
    expect(canonicalUrl('https://portfolio.example', '/log/hello-world')).toBeUndefined();
    expect(canonicalUrl(undefined, '/')).toBeUndefined();
    expect(sitemapXml(undefined)).not.toContain('<loc>');
    expect(
      sitemapXml('https://portfolio.example').match(/<loc>/g),
    ).toHaveLength(publicPaths.length + proofPaths.length + logPaths().length);
    expect(sitemapXml('https://portfolio.example')).not.toContain('private-id');
    expect(sitemapXml('https://portfolio.example')).not.toContain('/identity');
  });
});

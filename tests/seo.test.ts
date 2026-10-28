import { describe, expect, test } from 'bun:test';
import { required } from '../src/portfolio/required';
import { listedLogEntries } from '../src/portfolio/log';
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
    expect(canonicalUrl('https://portfolio.example', '/contribute')).toBe(
      'https://portfolio.example/contribute',
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
    expect(
      canonicalUrl('https://portfolio.example', '/log/hello-world'),
    ).toBeUndefined();
    expect(canonicalUrl(undefined, '/')).toBeUndefined();
    expect(sitemapXml(undefined)).not.toContain('<loc>');
    expect(
      sitemapXml('https://portfolio.example').match(/<loc>/g),
    ).toHaveLength(
      publicPaths.length +
        proofPaths.length +
        logPaths(listedLogEntries).length,
    );
    expect(sitemapXml('https://portfolio.example')).not.toContain('private-id');
    expect(sitemapXml('https://portfolio.example')).not.toContain('/identity');
  });
});

test('missing canonical configuration never blocks known public pages from indexing', async () => {
  const { robotsContent } = await import('../src/portfolio/seo');
  for (const path of [
    ...publicPaths,
    ...proofPaths,
    ...logPaths(listedLogEntries),
  ])
    expect(robotsContent(path)).toBe('index, follow');
  expect(robotsContent('/pgp', { noindex: true })).toBe('noindex, follow');
  expect(robotsContent('/404', { status: 404 })).toBe('noindex, nofollow');
  expect(robotsContent('/contribute/private-id')).toBe('noindex, nofollow');
  expect(robotsContent('/', { status: 500 })).toBe('noindex, nofollow');
  expect(robotsContent('/log/tag/development')).toBe('noindex, follow');
});
test('Astro site configuration supplies the canonical origin when runtime configuration is absent', async () => {
  const { resolveSiteOrigin } = await import('../src/portfolio/seo');
  expect(resolveSiteOrigin(undefined, 'https://portfolio.example/')).toBe(
    'https://portfolio.example',
  );
  expect(resolveSiteOrigin('https://new.example', 'https://old.example/')).toBe(
    'https://new.example',
  );
  expect(
    resolveSiteOrigin('http://localhost:4321', 'https://portfolio.example/'),
  ).toBeUndefined();
  expect(resolveSiteOrigin(undefined, undefined)).toBeUndefined();
});

test('only recognized public HTML paths have slash redirects', async () => {
  const { publicPathRedirect } = await import('../src/portfolio/seo');
  for (const path of [
    ...publicPaths,
    ...proofPaths,
    ...logPaths(),
    '/log/tag/development',
  ])
    if (path !== '/') expect(publicPathRedirect(`${path}/`)).toBe(path);
  for (const path of [
    '/',
    '/log',
    '/unknown/',
    '/contribute/private/',
    '/robots.txt/',
    '//evil.example/',
  ])
    expect(publicPathRedirect(path)).toBeUndefined();
});

test('large-image robots directives preserve the independent indexing decision', async () => {
  const { robotsMetaContent, isIndexableRobots } =
    await import('../src/portfolio/seo');
  expect(robotsMetaContent('index, follow')).toBe(
    'index, follow, max-image-preview:large',
  );
  expect(isIndexableRobots(robotsMetaContent('index, follow'))).toBe(true);
  for (const policy of [
    'noindex, follow',
    'noindex, nofollow',
    'none',
    'NOINDEX, follow',
  ]) {
    expect(isIndexableRobots(policy)).toBe(false);
    expect(robotsMetaContent(policy)).toBe(policy);
  }
});

test('home and articles describe one real person with consistent graph identifiers', async () => {
  const { homePageSchema, logArticleSchema } =
    await import('../src/portfolio/seo');
  const origin = 'https://portfolio.example';
  const home = homePageSchema(origin);
  const article = logArticleSchema(origin, required(listedLogEntries[0]));
  expect(homePageSchema(undefined)).toBeUndefined();
  const nodes = home?.['@graph'];
  expect(
    nodes?.find(
      (node) =>
        typeof node === 'object' &&
        '@type' in node &&
        node['@type'] === 'Person',
    ),
  ).toMatchObject({
    '@id': `${origin}/#person`,
    alternateName: ['onurstirner', 'onurbyte'],
  });
  expect(
    nodes?.find(
      (node) =>
        typeof node === 'object' &&
        '@type' in node &&
        node['@type'] === 'ProfilePage',
    ),
  ).toMatchObject({ mainEntity: { '@id': `${origin}/#person` } });
  expect(
    article?.['@graph'].find(
      (node) =>
        typeof node === 'object' &&
        '@type' in node &&
        node['@type'] === 'BlogPosting',
    ),
  ).toMatchObject({ author: { '@id': `${origin}/#person` } });
});

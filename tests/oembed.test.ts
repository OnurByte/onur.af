import { expect, test } from 'bun:test';
import { oembedResponse } from '../src/portfolio/oembed';
import { publicPaths } from '../src/portfolio/seo';
import { publicPreview } from '../src/portfolio/previews';

const origin = 'https://portfolio.example';
const request = (target = `${origin}/`, extra = '') =>
  new URL(`${origin}/oembed.json?url=${encodeURIComponent(target)}${extra}`);

test('homepage does not replace the HTML motto with generic oEmbed text', async () => {
  const result = await oembedResponse(origin, request()).json();
  expect(result).not.toHaveProperty('title');
  expect(result).not.toHaveProperty('description');
  expect(result.provider_name).toBe('Onur');
  expect(result.thumbnail_url).toBe(`${origin}/brand/icon.png`);
  const projectPage = await oembedResponse(
    origin,
    request(`${origin}/projects`),
  ).json();
  expect(projectPage.title).toBe('Projects · Onur');
  expect(projectPage.description).toBe(publicPreview('/projects')!.description);
});

test('only public same-origin canonical URLs produce link metadata', async () => {
  for (const path of publicPaths) {
    const response = oembedResponse(origin, request(`${origin}${path}`));
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
    expect(await response.json()).toMatchObject({
      type: 'link',
      version: '1.0',
      author_name: 'Onur',
    });
  }
  for (const target of [
    'https://external.example/',
    `${origin}/donate/private`,
    'invalid',
    'https://user:pass@portfolio.example/',
    `${origin}/?retry=secret`,
    `${origin}/#secret`,
  ]) {
    expect(oembedResponse(origin, request(target)).status).toBe(404);
  }
});

test('format and configured origin fail closed', () => {
  expect(oembedResponse(origin, request(undefined, '&format=xml')).status).toBe(
    501,
  );
  for (const unavailable of [
    undefined,
    'http://localhost',
    'https://user:pass@portfolio.example',
  ]) {
    expect(oembedResponse(unavailable, request()).status).toBe(503);
  }
});

test('thumbnail dimensions respect both limits using real available variants', async () => {
  for (const [extra, size] of [
    ['', 512],
    ['&maxwidth=500', 180],
    ['&maxheight=180', 180],
    ['&maxwidth=179', 0],
  ] as const) {
    const result = await oembedResponse(
      origin,
      request(undefined, extra),
    ).json();
    if (size) {
      expect(result.thumbnail_width).toBe(size);
      expect(result.thumbnail_height).toBe(size);
      expect(result.thumbnail_url).toBe(
        `${origin}/brand/${size === 512 ? 'icon.png' : 'apple-touch-icon.png'}`,
      );
    } else expect(result.thumbnail_url).toBeUndefined();
  }
  for (const extra of ['&maxwidth=0', '&maxheight=-1', '&maxwidth=no']) {
    expect(oembedResponse(origin, request(undefined, extra)).status).toBe(404);
  }
});

import { expect, test } from 'bun:test';
import sharp from 'sharp';
import {
  socialImage,
  socialImageResponse,
} from '../src/portfolio/social-image';
import { publicPaths, proofPaths } from '../src/portfolio/seo';
import { publicPreview } from '../src/portfolio/previews';

const imageUrl = (query = '') =>
  new URL(`https://portfolio.example/social/home.png${query}`);

test('identical concurrent and warm cards reuse rendered bytes, keeping variants distinct', async () => {
  const [first, concurrent] = await Promise.all([
    socialImage('home', 2),
    socialImage('home', 2),
  ]);
  expect(concurrent).toBe(first);
  expect(await socialImage('home', 2)).toBe(first);
  expect(await socialImage('home', 1)).not.toEqual(first);
  expect(await socialImage('rss', 2)).not.toEqual(first);
  await expect(socialImage('unknown', 2)).rejects.toThrow(
    'Unknown public page',
  );
  await expect(socialImage('home', 3)).rejects.toThrow('Invalid motto');
});

test('every public card is a readable 1200 by 630 monochrome PNG', async () => {
  for (const path of [...publicPaths, ...proofPaths]) {
    const png = await socialImage(publicPreview(path)!.key);
    const metadata = await sharp(png).metadata();
    expect(metadata).toMatchObject({ format: 'png', width: 1200, height: 630 });
    const { data, info } = await sharp(png)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let whitePixels = 0;
    let coloredPixels = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      if (data[i] !== data[i + 1] || data[i] !== data[i + 2]) coloredPixels++;
      if (data[i]! > 240) whitePixels++;
    }
    expect(coloredPixels).toBe(0);
    expect(whitePixels).toBeGreaterThan(3000);
    expect(data[0]).toBe(0);
  }
});

test('public image route accepts only known pages and motto indices', async () => {
  for (const key of [
    'checkout',
    'donate-order',
    '../home',
    'https://example.com',
  ])
    expect((await socialImageResponse(key, imageUrl())).status).toBe(404);
  for (const query of ['?m=-1', '?m=3', '?m=01', '?m=', '?m=0&m=1'])
    expect((await socialImageResponse('home', imageUrl(query))).status).toBe(
      400,
    );
  const result = await socialImageResponse('rss', imageUrl('?m=2'));
  expect(result.status).toBe(200);
  expect(result.headers.get('Content-Type')).toBe('image/png');
  expect(result.headers.get('Cache-Control')).toBe('public, max-age=86400');
  expect(
    Buffer.from(await result.arrayBuffer())
      .subarray(1, 4)
      .toString(),
  ).toBe('PNG');
  expect(await socialImage('home', 0)).not.toEqual(
    await socialImage('home', 1),
  );
});

test('home brand name matches the visible icon height and vertical alignment', async () => {
  const image = await socialImage('home');
  const bounds = async (left: number, width: number) => {
    const { data, info } = await sharp(image)
      .extract({ left, top: 55, width, height: 64 })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const rows: number[] = [];
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        if (data[(y * info.width + x) * info.channels]! > 32) {
          rows.push(y);
          break;
        }
      }
    }
    return { top: Math.min(...rows), bottom: Math.max(...rows) };
  };
  const icon = await bounds(72, 64);
  const name = await bounds(162, 300);
  expect(Math.abs(name.top - icon.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(name.bottom - icon.bottom)).toBeLessThanOrEqual(1);
});

test('log and proof cards include the same seal on the right', async () => {
  const seals = [];
  for (const key of [
    'log-cryptic-watchtower-watches',
    'verified-cryptic-watchtower-watches',
  ]) {
    const seal = await sharp(await socialImage(key))
      .extract({ left: 888, top: 220, width: 240, height: 240 })
      .removeAlpha()
      .raw()
      .toBuffer();
    expect(seal.some((channel) => channel > 240)).toBe(true);
    seals.push(seal);
  }
  expect(seals[0]!.equals(seals[1]!)).toBe(true);
});

test('historical social cards bind their image bytes and cache entry to the revision', async () => {
  const key = 'verified-cryptic-watchtower-watches';
  const first = await socialImage(key, 0, 1);
  expect(await socialImage(key, 0, 1)).toBe(first);
  expect(await socialImage(key, 0, 2)).not.toEqual(first);
  const response = await socialImageResponse(key, imageUrl('?r=1'));
  expect(Buffer.from(await response.arrayBuffer()).equals(first)).toBe(true);
  expect((await socialImageResponse(key, imageUrl('?r=999'))).status).toBe(404);
  expect((await socialImageResponse('home', imageUrl('?r=1'))).status).toBe(
    400,
  );
  expect((await socialImageResponse(key, imageUrl('?r=1&r=2'))).status).toBe(
    400,
  );
});

test('public share images are indexable while unlisted evidence images remain excluded', async () => {
  expect(
    (await socialImageResponse('home', imageUrl())).headers.get('X-Robots-Tag'),
  ).toBeNull();
  expect(
    (
      await socialImageResponse('log-obscure-archive-remembers', imageUrl())
    ).headers.get('X-Robots-Tag'),
  ).toBe('noindex');
});

import { expect, test } from 'bun:test';
import sharp from 'sharp';
import {
  socialImage,
  socialImageResponse,
} from '../src/portfolio/social-image';
import { publicPaths } from '../src/portfolio/seo';
import { publicPreview } from '../src/portfolio/previews';

const imageUrl = (query = '') =>
  new URL(`https://portfolio.example/social/home.png${query}`);

test('every public card is a readable 1200 by 630 monochrome PNG', async () => {
  for (const path of publicPaths) {
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

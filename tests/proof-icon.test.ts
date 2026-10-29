import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

test('verification seal is symmetric around both center axes', async () => {
  const svg = await readFile(
    new URL('../public/brand/proof.svg', import.meta.url),
    'utf8',
  );
  // The reference check is directional; isolate the external seal contour.
  const contour = /<path[^>]* d="([^"]+)"/.exec(svg)?.[1]?.split(/z/i)[0];
  if (!contour) throw new Error('Missing seal contour');
  const outline = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22"><path fill="white" d="${contour}Z"/></svg>`;
  const { data, info } = await sharp(Buffer.from(outline))
    .resize(256, 256)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let horizontal = 0;
  let vertical = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * 4 + 3] ?? 0;
      horizontal += Math.abs(
        alpha - (data[(y * info.width + info.width - 1 - x) * 4 + 3] ?? 0),
      );
      vertical += Math.abs(
        alpha - (data[((info.height - 1 - y) * info.width + x) * 4 + 3] ?? 0),
      );
    }
  }
  expect(horizontal / (info.width * info.height)).toBeLessThan(1);
  expect(vertical / (info.width * info.height)).toBeLessThan(1);
});

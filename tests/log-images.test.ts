import { expect, test } from 'bun:test';
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { parseLog } from '../src/portfolio/log';
import { prepareLogImages, applyLogImages } from '../src/portfolio/log-images';

const entry = (body: string, cover?: object) =>
  parseLog([
    {
      id: 'silent-lodge-convenes',
      title: 'Image test',
      summary: 'Images',
      revisions: [
        {
          version: 1,
          publishedAt: '2026-10-16T12:00:00Z',
          body,
          ...(cover ? { cover } : {}),
        },
      ],
    },
  ]);

test('local images get content-addressed WebP variants, intrinsic dimensions and responsive HTML', async () => {
  const root = await mkdtemp(join(tmpdir(), 'log-images-'));
  try {
    await mkdir(join(root, 'media'));
    await sharp({
      create: { width: 1200, height: 800, channels: 3, background: '#aaa' },
    })
      .png()
      .toFile(join(root, 'media/chart.png'));
    const manifest = await prepareLogImages(
      entry('![Chart](/media/chart.png)'),
      root,
    );
    const image = manifest['/media/chart.png']!;
    expect(image).toMatchObject({ width: 1200, height: 800 });
    expect(image.src).toMatch(/^\/log-media\/[a-f0-9]{64}-960.webp$/);
    expect(image.srcset).toContain('480w');
    expect(image.srcset).toContain('1200w');
    const metadata = await sharp(
      await readFile(join(root, image.src)),
    ).metadata();
    expect(metadata).toMatchObject({ format: 'webp', width: 960, height: 640 });
    const html = applyLogImages(
      '<p><img src="/media/chart.png" alt="Chart" loading="lazy"></p>',
      manifest,
    );
    expect(html).toContain('width="1200"');
    expect(html).toContain('height="800"');
    expect(html).toContain('srcset=');
    expect(html).toContain('loading="lazy"');
    expect(
      await prepareLogImages(entry('![Chart](/media/chart.png)'), root),
    ).toEqual(manifest);
    await sharp({
      create: { width: 1200, height: 800, channels: 3, background: '#111' },
    })
      .png()
      .toFile(join(root, 'media/chart.png'));
    expect(
      (await prepareLogImages(entry('![Chart](/media/chart.png)'), root))[
        '/media/chart.png'
      ]!.src,
    ).not.toBe(image.src);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('small/vector/GIF images keep their geometry, without upscaling or flattening animation formats', async () => {
  const root = await mkdtemp(join(tmpdir(), 'log-images-'));
  try {
    await writeFile(
      join(root, 'vector.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50"/></svg>',
    );
    await sharp({
      create: { width: 100, height: 50, channels: 3, background: '#aaa' },
    })
      .gif()
      .toFile(join(root, 'animated.gif'));
    const manifest = await prepareLogImages(
      entry('![Vector](/vector.svg)\n\n![Animation](/animated.gif)'),
      root,
    );
    expect(manifest['/vector.svg']).toMatchObject({
      src: '/vector.svg',
      width: 100,
      height: 50,
    });
    expect(manifest['/animated.gif']).toMatchObject({
      src: '/animated.gif',
      width: 100,
      height: 50,
    });
    expect(manifest['/animated.gif']!.srcset).toBeUndefined();
    expect(
      await prepareLogImages(
        entry('![Remote](https://example.com/image.png)'),
        root,
      ),
    ).toEqual({});
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('publication rejects missing files, escaping symlinks and false cover dimensions', async () => {
  const root = await mkdtemp(join(tmpdir(), 'log-images-'));
  const outside = await mkdtemp(join(tmpdir(), 'log-images-outside-'));
  try {
    await sharp({
      create: { width: 100, height: 50, channels: 3, background: '#aaa' },
    })
      .png()
      .toFile(join(outside, 'private.png'));
    await expect(
      prepareLogImages(entry('![Missing](/missing.png)'), root),
    ).rejects.toThrow('Log image');
    await symlink(join(outside, 'private.png'), join(root, 'escape.png'));
    await expect(
      prepareLogImages(entry('![Escape](/escape.png)'), root),
    ).rejects.toThrow('outside');
    await writeFile(
      join(root, 'chart.png'),
      await readFile(join(outside, 'private.png')),
    );
    await expect(
      prepareLogImages(
        entry('Content', {
          src: '/chart.png',
          alt: 'Chart',
          width: 200,
          height: 50,
        }),
        root,
      ),
    ).rejects.toThrow('dimensions');
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test('oriented photos use their displayed dimensions and generated output cannot escape public', async () => {
  const root = await mkdtemp(join(tmpdir(), 'log-images-'));
  const outside = await mkdtemp(join(tmpdir(), 'log-images-outside-'));
  try {
    await sharp({
      create: { width: 100, height: 50, channels: 3, background: '#aaa' },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toFile(join(root, 'photo.jpg'));
    const manifest = await prepareLogImages(
      entry('![Photo](/photo.jpg)'),
      root,
    );
    expect(manifest['/photo.jpg']).toMatchObject({ width: 50, height: 100 });
    expect(
      await sharp(
        await readFile(join(root, manifest['/photo.jpg']!.src)),
      ).metadata(),
    ).toMatchObject({ width: 50, height: 100 });
    await rm(join(root, 'log-media'), { recursive: true });
    await symlink(outside, join(root, 'log-media'));
    await expect(
      prepareLogImages(entry('![Photo](/photo.jpg)'), root),
    ).rejects.toThrow('outside');
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test('an existing generated filename symlink cannot overwrite a file outside public', async () => {
  const { createHash } = await import('node:crypto');
  const root = await mkdtemp(join(tmpdir(), 'log-images-'));
  const outside = await mkdtemp(join(tmpdir(), 'log-images-outside-'));
  try {
    const bytes = await sharp({
      create: { width: 100, height: 50, channels: 3, background: '#aaa' },
    })
      .png()
      .toBuffer();
    await writeFile(join(root, 'chart.png'), bytes);
    await mkdir(join(root, 'log-media'));
    const hash = createHash('sha256')
      .update('log-webp-v2')
      .update(bytes)
      .digest('hex');
    const target = join(outside, 'keep.txt');
    await writeFile(target, 'Keep this file');
    await symlink(target, join(root, 'log-media', `${hash}-100.webp`));
    const manifest = await prepareLogImages(
      entry('![Chart](/chart.png)'),
      root,
    );
    expect(await readFile(target, 'utf8')).toBe('Keep this file');
    expect(
      await sharp(
        await readFile(join(root, manifest['/chart.png']!.src)),
      ).metadata(),
    ).toMatchObject({ format: 'webp', width: 100 });
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

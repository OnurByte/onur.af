import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  readFile,
  realpath,
  writeFile,
  rename,
  rm,
} from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import sharp from 'sharp';
import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import type { Root } from 'hast';
import { logMetadata, type LogEntry } from './log';
import { renderLogContent } from './log-markdown';

export type LogImage = {
  src: string;
  width: number;
  height: number;
  srcset?: string;
  sizes?: string;
};
export type LogImages = Record<string, LogImage>;

/** Build-time only: never fetch arbitrary URLs or read outside public/. */
export async function prepareLogImages(
  entries: readonly LogEntry[],
  publicDirectory: string,
): Promise<LogImages> {
  const sources = new Map<string, { width: number; height: number }[]>();
  for (const entry of entries)
    for (const revision of entry.revisions) {
      const cover = logMetadata(entry, revision.version).cover;
      const images = renderLogContent(revision.body).images;
      for (const src of [...images, ...(cover ? [cover.src] : [])]) {
        if (!src.startsWith('/')) continue;
        if (!sources.has(src)) sources.set(src, []);
      }
      if (cover?.src.startsWith('/')) sources.get(cover.src)!.push(cover);
    }
  if (!sources.size) return {};
  const root = await realpath(publicDirectory);
  const destination = join(root, 'log-media');
  await mkdir(destination, { recursive: true });
  const generatedPath = relative(root, await realpath(destination));
  if (generatedPath.startsWith('..') || isAbsolute(generatedPath))
    throw new Error('Log image output outside public directory');
  const manifest: LogImages = {};
  for (const [src, covers] of sources) {
    let filename: string;
    try {
      filename = await realpath(
        resolve(
          root,
          `.${decodeURIComponent(new URL(src, 'https://log.invalid').pathname)}`,
        ),
      );
    } catch {
      throw new Error(`Log image not found: ${src}`);
    }
    const path = relative(root, filename);
    if (path.startsWith('..') || isAbsolute(path))
      throw new Error(`Log image outside public directory: ${src}`);
    const bytes = await readFile(filename);
    const metadata = await sharp(bytes, { animated: true }).metadata();
    const width = metadata.autoOrient?.width ?? metadata.width;
    const height =
      metadata.pageHeight ?? metadata.autoOrient?.height ?? metadata.height;
    if (!width || !height)
      throw new Error(`Log image dimensions unavailable: ${src}`);
    for (const cover of covers)
      if (cover.width !== width || cover.height !== height)
        throw new Error(`Log cover dimensions do not match image: ${src}`);
    if (
      metadata.format === 'svg' ||
      metadata.format === 'gif' ||
      (metadata.pages ?? 1) > 1
    ) {
      manifest[src] = { src, width, height };
      continue;
    }
    const hash = createHash('sha256')
      .update('log-webp-v2')
      .update(bytes)
      .digest('hex');
    const widths = [
      ...new Set(
        [480, 960, 1440, Math.min(width, 1920)].filter((size) => size <= width),
      ),
    ].sort((a, b) => a - b);
    const variants: { src: string; width: number }[] = [];
    for (const size of widths) {
      const name = `${hash}-${size}.webp`;
      const output = await sharp(bytes)
        .autoOrient()
        .resize({ width: size, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      const target = join(destination, name);
      const temporary = `${target}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporary, output, { flag: 'wx' });
        // Rename replaces an existing leaf symlink without following it.
        await rename(temporary, target);
      } finally {
        await rm(temporary, { force: true });
      }
      variants.push({ src: `/log-media/${name}`, width: size });
    }
    const fallback =
      variants.filter((variant) => variant.width <= 960).at(-1) ?? variants[0]!;
    manifest[src] = {
      src: fallback.src,
      width,
      height,
      srcset: variants
        .map((variant) => `${variant.src} ${variant.width}w`)
        .join(', '),
      sizes: '(max-width: 632px) calc(100vw - 40px), 592px',
    };
  }
  return manifest;
}

/** Only generated attributes are substituted; authored alt/title remain intact. */
export function applyLogImages(html: string, images: LogImages): string {
  if (!Object.keys(images).length) return html;
  return String(
    unified()
      .use(rehypeParse, { fragment: true })
      .use(() => (tree: Root) => {
        visit(tree, 'element', (node) => {
          if (node.tagName !== 'img') return;
          const image = images[String(node.properties.src)];
          if (image)
            Object.assign(node.properties, {
              src: image.src,
              width: image.width,
              height: image.height,
              ...(image.srcset
                ? { srcSet: image.srcset, sizes: image.sizes }
                : {}),
            });
        });
      })
      .use(rehypeStringify)
      .processSync(html),
  );
}

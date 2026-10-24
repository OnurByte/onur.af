import { expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createFileEmbedCache,
  createVercelBlobEmbedCache,
} from '../src/portfolio/embed-cache';

test('file cache survives recreation and ignores missing or corrupt cache files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-embed-cache-'));
  try {
    const cache = createFileEmbedCache(directory);
    expect(await cache.read('x')).toBeUndefined();
    const value = { fetchedAt: 100, snapshot: { status: 'empty', items: [] } };
    await cache.write('x', value);
    expect(await createFileEmbedCache(directory).read('x')).toEqual(value);
    await writeFile(join(directory, 'github.json'), 'invalid JSON');
    expect(await cache.read('github')).toBeUndefined();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('private Blob keys isolate providers and preserve the existing Spotify history path', async () => {
  const values = new Map<string, string>();
  const paths: string[] = [];
  const cache = createVercelBlobEmbedCache({
    get: (pathname) => {
      paths.push(pathname);
      const value = values.get(pathname);
      return Promise.resolve(
        value === undefined
          ? null
          : {
              statusCode: 200 as const,
              stream: new ReadableStream<Uint8Array>({
                start(controller) {
                  controller.enqueue(new TextEncoder().encode(value));
                  controller.close();
                },
              }),
              headers: new Headers(),
              blob: {
                url: '',
                downloadUrl: '',
                pathname,
                contentType: 'application/json',
                contentDisposition: '',
                cacheControl: 'public, max-age=60',
                size: value.length,
                uploadedAt: new Date(),
                etag: '',
              },
            },
      );
    },
    put: (pathname, value) => {
      if (typeof value !== 'string') throw new Error('Expected JSON string');
      values.set(pathname, value);
      return Promise.resolve({
        url: '',
        downloadUrl: '',
        pathname,
        contentType: 'application/json',
        contentDisposition: '',
        etag: '',
      });
    },
  });
  for (const id of ['x', 'github', 'spotify'] as const)
    await cache.write(id, { id });
  for (const id of ['x', 'github', 'spotify'] as const)
    expect(await cache.read(id)).toEqual({ id });
  expect(paths).toEqual([
    'portfolio/embeds/x.json',
    'portfolio/embeds/github.json',
    'portfolio/embeds/spotify-history.json',
  ]);
});

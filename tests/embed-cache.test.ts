import { expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileEmbedCache } from '../src/portfolio/embed-cache';

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

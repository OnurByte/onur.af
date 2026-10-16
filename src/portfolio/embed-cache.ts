import { mkdir, readFile, rename, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { get, put } from '@vercel/blob';

export interface EmbedCache {
  read(id: 'x' | 'github' | 'spotify'): Promise<unknown>;
  write(id: 'x' | 'github' | 'spotify', value: unknown): Promise<void>;
}

/** Local server snapshots survive reloads; Vercel's writable /tmp is instance-local. */
export function createFileEmbedCache(directory: string): EmbedCache {
  return {
    async read(id) {
      try {
        return JSON.parse(
          await readFile(join(directory, `${id}.json`), 'utf8'),
        );
      } catch {
        return undefined;
      }
    },
    async write(id, value) {
      await mkdir(directory, { recursive: true });
      const temporary = join(directory, `${id}-${randomUUID()}.tmp`);
      try {
        await writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
        await rename(temporary, join(directory, `${id}.json`));
      } finally {
        await rm(temporary, { force: true });
      }
    },
  };
}

/** Spotify history is shared across Vercel function instances via private Blob storage. */
export function createVercelBlobEmbedCache(): EmbedCache {
  const pathname = 'portfolio/embeds/spotify-history.json';
  return {
    async read() {
      const blob = await get(pathname, { access: 'private', useCache: false });
      if (!blob || blob.statusCode !== 200) return undefined;
      return JSON.parse(await new Response(blob.stream).text());
    },
    async write(_id, value) {
      await put(pathname, JSON.stringify(value), {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60,
        contentType: 'application/json',
      });
    },
  };
}

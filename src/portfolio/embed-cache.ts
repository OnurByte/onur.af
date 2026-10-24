import { readJsonFile } from '../server/json-file';
import { mkdir, rename, writeFile, rm } from 'node:fs/promises';
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
        return await readJsonFile(join(directory, `${id}.json`));
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

/** Provider snapshots are shared across Vercel instances via private Blob storage. */
export function createVercelBlobEmbedCache(
  blob: Pick<{ get: typeof get; put: typeof put }, 'get' | 'put'> = {
    get,
    put,
  },
): EmbedCache {
  const pathname = (id: 'x' | 'github' | 'spotify') =>
    `portfolio/embeds/${id === 'spotify' ? 'spotify-history' : id}.json`;
  return {
    async read(id) {
      const result = await blob.get(pathname(id), {
        access: 'private',
        useCache: false,
      });
      if (!result || result.statusCode !== 200) return undefined;
      return JSON.parse(await new Response(result.stream).text());
    },
    async write(id, value) {
      await blob.put(pathname(id), JSON.stringify(value), {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 60,
        contentType: 'application/json',
      });
    },
  };
}

import { z } from 'astro/zod';
import {
  embedSnapshotSchema,
  trackItemSchema,
  type EmbedMetadata,
  type Embed,
} from './embeds';

/** Saved content is useful without allowing a slow store into the document's critical path. */
export async function readEmbedFallback(
  source: EmbedMetadata,
  read: () => Promise<unknown>,
  budgetMs = 60,
): Promise<Embed> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unavailable: Embed = { ...source, status: 'unavailable', items: [] };
  try {
    const value = await Promise.race([
      read(),
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => {
          resolve(undefined);
        }, budgetMs);
      }),
    ]);
    if (source.id === 'spotify') {
      const saved = z
        .object({ recent: z.array(trackItemSchema).max(5) })
        .parse(value);
      return {
        ...source,
        status: saved.recent.length ? 'stale' : 'unavailable',
        items: [],
        recentTracks: saved.recent,
        playbackState: 'unknown',
      };
    }
    const saved = z.object({ snapshot: embedSnapshotSchema }).parse(value);
    return {
      ...source,
      ...saved.snapshot,
      status: saved.snapshot.items.length ? 'stale' : 'empty',
    };
  } catch {
    return unavailable;
  } finally {
    clearTimeout(timer);
  }
}

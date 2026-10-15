import {
  embedMetadataSchema,
  embedSnapshotSchema,
  parseEmbeds,
  type Embed,
  type EmbedMetadata,
} from './embeds';

/** Server-only adapter: normalize upstream data, never return provider HTML. */
export interface EmbedSource extends EmbedMetadata {
  load: (signal: AbortSignal) => Promise<unknown>;
}

export async function loadEmbeds(
  sources: readonly EmbedSource[],
  { timeoutMs = 3000 }: { timeoutMs?: number } = {},
): Promise<Embed[]> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Embed timeout must be a positive finite number');
  }
  const ids = new Set<string>();
  const metadata = sources.map(({ load: _load, ...source }) => {
    const parsed = embedMetadataSchema.parse(source);
    if (ids.has(parsed.id)) throw new Error(`Duplicate embed id: ${parsed.id}`);
    ids.add(parsed.id);
    return parsed;
  });
  const results = await Promise.all(
    sources.map(async (source, index): Promise<Embed> => {
      const meta = metadata[index]!;
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeout = new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error('Embed source timed out'));
          }, timeoutMs);
        });
        const raw = await Promise.race([
          Promise.resolve().then(() => source.load(controller.signal)),
          timeout,
        ]);
        const snapshot = embedSnapshotSchema.parse(raw);
        return { ...meta, ...snapshot };
      } catch {
        return { ...meta, status: 'unavailable', items: [] };
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
    }),
  );
  return parseEmbeds(results);
}

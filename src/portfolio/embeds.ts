import { z } from 'astro/zod';

const httpsUrl = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === 'https:' && !url.username && !url.password;
}, 'Use an absolute HTTPS URL without credentials');
const itemFields = {
  title: z.string().trim().min(1).max(160),
  href: httpsUrl,
  detail: z.string().trim().min(1).max(240).optional(),
};
export const trackItemSchema = z
  .object({
    ...itemFields,
    kind: z.literal('track'),
    playback: z
      .object({
        startedAt: z.number().int().nonnegative(),
        endsAt: z.number().int().nonnegative(),
      })
      .refine((value) => value.endsAt > value.startedAt)
      .optional(),
    playedAt: z.iso.datetime({ offset: true }).optional(),
  })
  .strict();
const embedItemSchema = z.discriminatedUnion('kind', [
  trackItemSchema,
  z
    .object({
      ...itemFields,
      kind: z.literal('post'),
      likes: z.number().int().nonnegative().optional(),
      reposts: z.number().int().nonnegative().optional(),
      text: z.string().trim().min(1).max(5000),
      publishedAt: z.iso.datetime({ offset: true }).optional(),
    })
    .strict(),
  z
    .object({
      ...itemFields,
      kind: z.literal('repository'),
      language: z.string().trim().min(1).max(80).optional(),
      stars: z.number().int().nonnegative().optional(),
      commits: z.number().int().nonnegative().optional(),
      commitWeeks: z.number().int().positive().optional(),
    })
    .strict(),
  z.object({ ...itemFields, kind: z.literal('link') }).strict(),
]);
export const embedMetadataSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    title: z.string().trim().min(1).max(80),
    source: z.string().trim().min(1).max(80),
    href: httpsUrl,
  })
  .strict();
const snapshotFields = {
  playbackState: z.enum(['playing', 'idle', 'unknown']).optional(),
  items: z.array(embedItemSchema).max(5),
  recentTracks: z.array(trackItemSchema).max(5).optional(),
  updatedAt: z.iso.datetime({ offset: true }).optional(),
  status: z.enum(['ready', 'empty', 'unavailable', 'stale']),
};
function consistentSnapshot(snapshot: {
  status: string;
  items: readonly unknown[];
  recentTracks?: readonly unknown[] | undefined;
}): boolean {
  return snapshot.status === 'empty' || snapshot.status === 'unavailable'
    ? snapshot.items.length === 0 && !snapshot.recentTracks?.length
    : snapshot.items.length > 0 || Boolean(snapshot.recentTracks?.length);
}
const snapshotMessage =
  'Ready/stale sources require items or recent tracks; empty/unavailable sources must have neither';
export const embedSnapshotSchema = z
  .object(snapshotFields)
  .strict()
  .refine(consistentSnapshot, snapshotMessage);
const embedSchema = embedMetadataSchema
  .extend(snapshotFields)
  .refine(consistentSnapshot, snapshotMessage);
export type Embed = z.infer<typeof embedSchema>;
export type EmbedItem = z.infer<typeof embedItemSchema>;
export type EmbedMetadata = z.infer<typeof embedMetadataSchema>;

/** Only normalized native data crosses the rendering boundary. Never HTML. */
export function parseEmbeds(input: unknown): Embed[] {
  const embeds = z.array(embedSchema).parse(input);
  const ids = new Set<string>();
  for (const embed of embeds) {
    if (ids.has(embed.id)) throw new Error(`Duplicate embed id: ${embed.id}`);
    ids.add(embed.id);
  }
  return embeds;
}

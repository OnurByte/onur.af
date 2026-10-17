import { z } from 'astro/zod';
import tagDefinitions from '../content/log-tags.json' with { type: 'json' };
import { renderLogContent, validLogImageSource } from './log-markdown';
import rawEntries from '../content/log.json' with { type: 'json' };

const titleSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .refine((value) => !/[\r\n]/.test(value));
export const logTagDefinitions: Record<
  string,
  { title: string; description: string; indexable: boolean }
> = tagDefinitions;
const sourceSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    url: z
      .string()
      .trim()
      .min(1)
      .max(2048)
      .refine((value) => {
        if (/[\u0000-\u0020\u007f\\]/.test(value) || value.startsWith('//'))
          return false;
        try {
          const local = value.startsWith('/');
          const url = new URL(
            value,
            local ? 'https://sources.invalid' : undefined,
          );
          return (
            !url.username &&
            !url.password &&
            (local
              ? url.origin === 'https://sources.invalid'
              : ['http:', 'https:'].includes(url.protocol))
          );
        } catch {
          return false;
        }
      }, 'Use a local absolute path or HTTP(S) URL without credentials'),
  })
  .strict();
const revisionSchema = z
  .object({
    version: z.number().int().positive(),
    publishedAt: z.iso.datetime({ offset: true }),
    body: z.string().min(1).max(200000),
    title: titleSchema.optional(),
    sources: z.array(sourceSchema).max(100).optional(),
    summary: z.string().trim().min(1).max(4000).optional(),
    language: z
      .string()
      .regex(/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/)
      .optional(),
    tags: z
      .array(
        z
          .string()
          .refine(
            (tag) => Object.hasOwn(logTagDefinitions, tag),
            'Unknown Log tag',
          ),
      )
      .max(12)
      .refine((tags) => new Set(tags).size === tags.length, 'Duplicate Log tag')
      .optional(),
    cover: z
      .object({
        src: z
          .string()
          .refine(validLogImageSource, 'Use a local image path or HTTPS URL'),
        alt: z.string().trim().min(1).max(1000),
        caption: z.string().trim().min(1).max(2000).optional(),
        width: z.number().int().positive().max(20000),
        height: z.number().int().positive().max(20000),
      })
      .strict()
      .optional(),
  })
  .strict();
const entrySchema = z
  .object({
    id: z.string().regex(/^[a-z]+-[a-z]+-[a-z]+$/),
    title: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .refine((value) => !/[\r\n]/.test(value)),
    summary: z.string().trim().min(1).max(4000),
    revisions: z.array(revisionSchema).min(1),
  })
  .strict();
export type LogEntry = z.infer<typeof entrySchema>;
export function parseLog(input: unknown): LogEntry[] {
  const entries = z.array(entrySchema).parse(input);
  const availableIds = new Set(entries.map((entry) => entry.id));
  const usedTags = new Set(
    entries.flatMap((entry) => entry.revisions.at(-1)!.tags ?? []),
  );
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error(`Duplicate Log id: ${entry.id}`);
    ids.add(entry.id);
    entry.revisions.forEach((revision, index) => {
      const content = renderLogContent(revision.body);
      for (const href of [
        ...content.links,
        ...(revision.sources ?? []).map((source) => source.url),
      ]) {
        // Archived signed snapshots must survive changes to the current navigation.
        if (index !== entry.revisions.length - 1 || !href.startsWith('/log/'))
          continue;
        const pathname = new URL(href, 'https://log.invalid').pathname;
        const tag = pathname.match(/^\/log\/tag\/([^/]+)$/)?.[1];
        if (
          tag
            ? !usedTags.has(tag)
            : !availableIds.has(pathname.slice('/log/'.length))
        )
          throw new Error(`Unknown Log link: ${href}`);
      }
      if (revision.version !== index + 1)
        throw new Error('Log revisions must be consecutive and start at 1');
      if (
        index > 0 &&
        Date.parse(revision.publishedAt) <=
          Date.parse(entry.revisions[index - 1]!.publishedAt)
      )
        throw new Error('Log revision dates must increase');
    });
  }
  return entries.sort(
    (a, b) =>
      Date.parse(b.revisions[0]!.publishedAt) -
        Date.parse(a.revisions[0]!.publishedAt) ||
      a.id.localeCompare(b.id, 'en'),
  );
}
/** The generated ID is the only public permalink and signed identity. */
export const logUrl = (entry: Pick<LogEntry, 'id'>) => `/log/${entry.id}`;
export const logProofUrl = (entry: Pick<LogEntry, 'id'>, version?: number) =>
  `/log/${entry.id}/verified${version === undefined ? '' : `?v=${version}`}`;
export const logRevisionUrl = (entry: Pick<LogEntry, 'id'>, version: number) =>
  `/proofs/${entry.id}-v${version}.md`;
export const getLogEntryById = (id: string | undefined): LogEntry | undefined =>
  logEntries.find((entry) => entry.id === id);

export function logMetadata(
  entry: LogEntry,
  version = entry.revisions.at(-1)!.version,
) {
  const revision = entry.revisions.find((item) => item.version === version);
  if (!revision) throw new Error('Unknown Log revision');
  return {
    title: revision.title ?? entry.title,
    summary: revision.summary ?? entry.summary,
    language: revision.language ?? 'en',
    tags: revision.tags ?? [],
    cover: revision.cover,
    sources: revision.sources ?? [],
  };
}

/** Exact, downloadable signed bytes. Existing revisions must never be edited. */
export function revisionMarkdown(entry: LogEntry, version: number): string {
  const revision = entry.revisions.find((item) => item.version === version);
  if (!revision) throw new Error('Unknown Log revision');
  const metadata = logMetadata(entry, version);
  const extra = [
    revision.language === undefined
      ? ''
      : `language: ${JSON.stringify(revision.language)}\n`,
    revision.tags === undefined
      ? ''
      : `tags: ${JSON.stringify(revision.tags)}\n`,
    revision.cover === undefined
      ? ''
      : `cover: ${JSON.stringify(revision.cover)}\n`,
    revision.sources === undefined
      ? ''
      : `sources: ${JSON.stringify(revision.sources)}\n`,
  ].join('');
  return `---\nid: ${entry.id}\ntitle: ${JSON.stringify(metadata.title)}\nsummary: ${JSON.stringify(metadata.summary)}\nversion: ${version}\npublished: ${entry.revisions[0]!.publishedAt}\nupdated: ${revision.publishedAt}\n${extra}---\n\n${revision.body}\n`;
}
export function readingTime(markdown: string): string {
  let codeLines = 0;
  const prose = markdown
    .replace(/```[^\n]*\n([\s\S]*?)```/g, (_, code: string) => {
      codeLines += code.trim().split('\n').length;
      return '';
    })
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/[#*_`~>|]/g, '');
  const words = prose.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  const seconds = Math.max(
    5,
    Math.ceil(((words / 240) * 60 + codeLines * 2) / 5) * 5,
  );
  return seconds < 60
    ? `${seconds} sec read`
    : `${Math.ceil(seconds / 60)} min read`;
}
export function logFeedEntries(entries: readonly LogEntry[]) {
  return entries.map((entry) => ({
    id: `log-${entry.id}`,
    title: logMetadata(entry).title,
    summary: logMetadata(entry).summary,
    publishedAt: entry.revisions[0]!.publishedAt,
    url: logUrl(entry),
  }));
}
export const logEntries = parseLog(rawEntries);

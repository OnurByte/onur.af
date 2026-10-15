import { z } from 'astro/zod';
import rawEntries from '../content/log.json' with { type: 'json' };

const revisionSchema = z
  .object({
    version: z.number().int().positive(),
    publishedAt: z.iso.datetime({ offset: true }),
    body: z.string().min(1).max(200000),
  })
  .strict();
const entrySchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*$/)
      .max(120),
    slug: z.string().regex(/^[a-z]+-[a-z]+-[a-z]+$/),
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
  const ids = new Set<string>();
  const routes = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) throw new Error(`Duplicate Log id: ${entry.id}`);
    ids.add(entry.id);
    // Reserve both the public slug and legacy signed ID to keep redirects unambiguous.
    for (const route of new Set([entry.slug, entry.id])) {
      if (routes.has(route)) throw new Error(`Duplicate Log route: ${route}`);
      routes.add(route);
    }
    entry.revisions.forEach((revision, index) => {
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
/** Public URLs use the three-word slug; the signed ID never changes. */
export const logUrl = (entry: Pick<LogEntry, 'slug'>) => `/log/${entry.slug}`;
export const logProofUrl = (entry: Pick<LogEntry, 'slug'>, version?: number) =>
  `/pgp/log/${entry.slug}${version === undefined ? '' : `?v=${version}`}`;
export const logRevisionUrl = (
  entry: Pick<LogEntry, 'slug'>,
  version: number,
) => `/proofs/${entry.slug}-v${version}.md`;
export const logEntryForPath = (
  path: string | undefined,
): LogEntry | undefined =>
  logEntries.find((entry) => entry.slug === path || entry.id === path);

/** Exact, downloadable signed bytes. Existing revisions must never be edited. */
export function revisionMarkdown(entry: LogEntry, version: number): string {
  const revision = entry.revisions.find((item) => item.version === version);
  if (!revision) throw new Error('Unknown Log revision');
  return `---\nid: ${entry.id}\ntitle: ${JSON.stringify(entry.title)}\nsummary: ${JSON.stringify(entry.summary)}\nversion: ${version}\npublished: ${entry.revisions[0]!.publishedAt}\nupdated: ${revision.publishedAt}\n---\n\n${revision.body}\n`;
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
    title: entry.title,
    summary: entry.summary,
    publishedAt: entry.revisions[0]!.publishedAt,
    url: logUrl(entry),
  }));
}
export const logEntries = parseLog(rawEntries);

import { z } from 'astro/zod';

const repositorySchema = z.object({
  name: z.string().min(1),
  html_url: z.url().refine((value) => {
    const url = new URL(value);
    return (
      url.origin === 'https://github.com' &&
      url.pathname.toLowerCase().startsWith('/onurbyte/')
    );
  }),
  description: z.string().nullable(),
  language: z.string().nullable(),
  pushed_at: z.iso.datetime(),
});

/** Read GitShow's serialized category data as JSON, without executing scripts or rendering its HTML. */
export function parseGitShowRepositories(html: string) {
  let stream = '';
  for (const match of html.matchAll(
    /self\.__next_f\.push\((\[[^\n]*?\])\)<\/script>/g,
  )) {
    try {
      const chunk: unknown = JSON.parse(match[1]!);
      if (
        Array.isArray(chunk) &&
        chunk[0] === 1 &&
        typeof chunk[1] === 'string'
      )
        stream += chunk[1];
    } catch {
      /* Ignore unrelated script payloads. */
    }
  }
  const repositories = new Map<string, z.infer<typeof repositorySchema>>();
  let foundCategories = false;
  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      for (const child of value) visit(child);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.categories)) {
      foundCategories = true;
      for (const category of record.categories) {
        if (!category || !Array.isArray(category.repos))
          throw new Error('Invalid GitShow category');
        for (const raw of category.repos) {
          const repo = repositorySchema.parse(raw);
          repositories.set(repo.html_url, repo);
        }
      }
    }
    for (const child of Object.values(record)) visit(child);
  }
  for (const row of stream.split('\n')) {
    const start = row.indexOf(':');
    if (start < 0 || !/^[\da-f]+$/.test(row.slice(0, start))) continue;
    let value: unknown;
    try {
      value = JSON.parse(row.slice(start + 1));
    } catch {
      continue;
    }
    visit(value);
  }
  if (!foundCategories) throw new Error('GitShow repository data missing');
  return [...repositories.values()]
    .sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at))
    .slice(0, 5);
}

/** GitShow's activity chart reports the last 12 weeks, not lifetime commits. */
export function parseGitShowCommitActivity(html: string): number | undefined {
  const weeks = [...html.matchAll(/title="Week (\d+): (\d+) commits?"/g)];
  if (
    weeks.length !== 12 ||
    new Set(weeks.map((match) => match[1])).size !== 12
  )
    return undefined;
  const count = weeks.reduce((sum, match) => sum + Number(match[2]), 0);
  return Number.isSafeInteger(count) ? count : undefined;
}

import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { generateLogSlug } from '../src/portfolio/log-slug';
import { parseLog } from '../src/portfolio/log';

const [title, summary, markdownFile, ...extra] = process.argv.slice(2);
if (!title?.trim() || !summary?.trim() || !markdownFile || extra.length)
  throw new Error('Usage: bun run log:new "Title" "Summary" article.md');

const body = await readFile(markdownFile, 'utf8');
if (!body.trim()) throw new Error('Cannot create an empty Log entry');

const target = fileURLToPath(
  new URL('../src/content/log.json', import.meta.url),
);
const current = JSON.parse(await readFile(target, 'utf8'));
const entries = parseLog(current);
const reserved = new Set(entries.flatMap((entry) => [entry.id, entry.slug]));
const slug = generateLogSlug(reserved);
const next = [
  ...entries,
  {
    id: slug,
    slug,
    title: title.trim(),
    summary: summary.trim(),
    revisions: [{ version: 1, publishedAt: new Date().toISOString(), body }],
  },
];
parseLog(next);

const temporary = `${target}.${randomUUID()}.tmp`;
try {
  await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, {
    flag: 'wx',
  });
  await rename(temporary, target);
} finally {
  await rm(temporary, { force: true });
}
console.log(
  `Created draft /log/${slug}. Sign before deploying: bun run log:publish ${slug}`,
);

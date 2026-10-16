import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { generateLogId } from '../src/portfolio/log-id';
import { parseLog } from '../src/portfolio/log';

const [title, summary, markdownFile, metadataFile, ...extra] =
  process.argv.slice(2);
if (!title?.trim() || !summary?.trim() || !markdownFile || extra.length)
  throw new Error(
    'Usage: bun run log:new "Title" "Summary" article.md [metadata.json]',
  );

const metadata: unknown = metadataFile
  ? JSON.parse(await readFile(metadataFile, 'utf8'))
  : {};
if (
  !metadata ||
  typeof metadata !== 'object' ||
  Array.isArray(metadata) ||
  Object.keys(metadata).some(
    (key) => !['language', 'tags', 'cover', 'sources'].includes(key),
  )
)
  throw new Error('Metadata accepts only language, tags, cover and sources');
const body = await readFile(markdownFile, 'utf8');
if (!body.trim()) throw new Error('Cannot create an empty Log entry');

const target = fileURLToPath(
  new URL('../src/content/log.json', import.meta.url),
);
const current = JSON.parse(await readFile(target, 'utf8'));
const entries = parseLog(current);
const reserved = new Set(entries.map((entry) => entry.id));
const id = generateLogId(reserved);
const next = [
  ...entries,
  {
    id,
    title: title.trim(),
    summary: summary.trim(),
    revisions: [
      {
        version: 1,
        publishedAt: new Date().toISOString(),
        title: title.trim(),
        summary: summary.trim(),
        language: 'en',
        tags: [],
        ...metadata,
        body,
      },
    ],
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
  `Created draft /log/${id}. Sign before deploying: bun run log:publish ${id}`,
);

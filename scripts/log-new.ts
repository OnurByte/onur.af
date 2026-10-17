import { readJsonFile, writeJsonFile } from '../src/server/json-file';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { generateLogId } from '../src/portfolio/log-id';
import { parseLog } from '../src/portfolio/log';

const [title, summary, markdownFile, metadataFile, ...extra] =
  process.argv.slice(2);
if (
  !title?.trim() ||
  !summary?.trim() ||
  !markdownFile ||
  !metadataFile ||
  extra.length
)
  throw new Error(
    'Usage: bun run log:new "Title" "Summary" article.md metadata.json',
  );

const metadata: unknown = metadataFile ? await readJsonFile(metadataFile) : {};
if (
  !metadata ||
  typeof metadata !== 'object' ||
  Array.isArray(metadata) ||
  Object.keys(metadata).some(
    (key) => !['language', 'tags', 'cover', 'sources'].includes(key),
  )
)
  throw new Error('Metadata accepts only language, tags, cover and sources');
if (
  !Array.isArray((metadata as { tags?: unknown }).tags) ||
  (metadata as { tags: unknown[] }).tags.length < 1 ||
  (metadata as { tags: unknown[] }).tags.length > 5
)
  throw new Error('Metadata must include 1 to 5 canonical Log tags');
const body = await readFile(markdownFile, 'utf8');
if (!body.trim()) throw new Error('Cannot create an empty Log entry');

const target = fileURLToPath(
  new URL('../src/content/log.json', import.meta.url),
);
const current = await readJsonFile(target);
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

await writeJsonFile(target, next);
console.log(
  `Created draft /log/${id}. Sign before deploying: bun run log:publish ${id}`,
);

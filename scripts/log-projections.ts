import { z } from 'astro/zod';
import { readFile, writeFile } from 'node:fs/promises';
import { logEntries, revisionMarkdown } from '../src/portfolio/log';
import { createHash } from 'node:crypto';
import {
  freezeProjection,
  validateProjection,
} from '../src/portfolio/text-projection';
const path = new URL('../src/content/log-projections.json', import.meta.url);
const mode = process.argv[2];
if (!['prepare', '--check'].includes(mode ?? ''))
  throw new Error('Usage: bun scripts/log-projections.ts prepare|--check');
const records = z
  .record(z.string(), z.unknown())
  .parse(JSON.parse(await readFile(path, 'utf8')) as unknown);
for (const entry of logEntries)
  for (const revision of entry.revisions) {
    const key = `${entry.id}-v${String(revision.version)}`;
    if (records[key]) {
      const p = validateProjection(records[key]);
      // Compare the signed binding, never rerender an existing frozen projection.
      if (
        p.revisionHash !==
        createHash('sha256')
          .update(revisionMarkdown(entry, revision.version))
          .digest('hex')
      )
        throw new Error(`Changed signed revision ${key}`);
    } else {
      if (mode === '--check') throw new Error(`Missing projection ${key}`);
      records[key] = freezeProjection(entry, revision.version);
    }
  }
if (mode === 'prepare')
  await writeFile(path, JSON.stringify(records, null, 2) + '\n');
console.log('Frozen Log projections verified');

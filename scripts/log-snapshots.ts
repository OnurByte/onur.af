import { z } from 'astro/zod';
import { readFile, writeFile, realpath } from 'node:fs/promises';
import { resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logEntries } from '../src/portfolio/log';
import { revisionProjection } from '../src/portfolio/text-projection';
import { createSnapshot, validateSnapshot } from '../src/portfolio/memento';
import { publicRequest } from '../src/portfolio/public-request';
const [mode, flag] = process.argv.slice(2);
if (
  !['prepare', '--check'].includes(mode ?? '') ||
  (flag && flag !== '--reconstruct')
)
  throw new Error(
    'Usage: bun scripts/log-snapshots.ts prepare [--reconstruct]|--check',
  );
const path = new URL('../src/content/log-snapshots.json', import.meta.url);
const records = z
  .record(z.string(), z.unknown())
  .parse(JSON.parse(await readFile(path, 'utf8')) as unknown);
const mime: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};
async function asset(source: string) {
  if (source.startsWith('/') && !source.startsWith('//')) {
    const root = await realpath('public');
    const file = await realpath(resolve(root, '.' + source));
    if (!file.startsWith(root + '/'))
      throw new Error('Snapshot media escapes public directory');
    const bytes = await readFile(file);
    if (bytes.length > 2_000_000)
      throw new Error('Snapshot media exceeds size limit');
    return { bytes, type: mime[extname(file)] ?? '' };
  }
  const response = await publicRequest(source);
  if (!response.ok) throw new Error('Snapshot media unavailable');
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    type: response.headers.get('content-type')?.split(';')[0] ?? '',
  };
}
async function mathCss() {
  const cssPath = fileURLToPath(
    import.meta.resolve('katex/dist/katex.min.css'),
  );
  let css = await readFile(cssPath, 'utf8');
  const urls = [
    ...new Set([...css.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1] ?? '')),
  ];
  for (const url of urls) {
    const bytes = await readFile(resolve(dirname(cssPath), url));
    const type = url.endsWith('.woff2')
      ? 'font/woff2'
      : url.endsWith('.woff')
        ? 'font/woff'
        : 'font/ttf';
    css = css.replaceAll(
      `url(${url})`,
      `url(data:${type};base64,${bytes.toString('base64')})`,
    );
  }
  return css;
}
const archivedAt = new Date(Math.floor(Date.now() / 1000) * 1000).toISOString();
for (const entry of logEntries)
  for (const revision of entry.revisions) {
    const key = `${entry.id}-v${String(revision.version)}`;
    const projection = revisionProjection(entry, revision.version);
    if (records[key]) {
      const s = validateSnapshot(records[key]);
      if (
        s.revisionHash !== projection.revisionHash ||
        s.projectionHash !== projection.projectionHash ||
        s.logId !== entry.id ||
        s.version !== revision.version
      )
        throw new Error(`Snapshot binding mismatch ${key}`);
    } else if (mode === '--check') throw new Error(`Missing snapshot ${key}`);
    else {
      const reconstructed =
        flag === '--reconstruct' ||
        Date.now() - Date.parse(revision.publishedAt) > 300_000;
      records[key] = await createSnapshot(
        entry,
        revision.version,
        projection,
        archivedAt,
        reconstructed ? 'reconstructed' : 'captured',
        asset,
        projection.render.html.includes('class="katex') ? await mathCss() : '',
      );
    }
  }
if (mode === 'prepare')
  await writeFile(path, JSON.stringify(records, null, 2) + '\n');
console.log(
  `Immutable Log snapshots verified (${String(Object.keys(records).length)})`,
);

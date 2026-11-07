import { createHash } from 'node:crypto';
import { z } from 'astro/zod';
import { fromHtml } from 'hast-util-from-html';
import { unified } from 'unified';
import rehypeStringify from 'rehype-stringify';
import { visit } from 'unist-util-visit';
import records from '../content/log-snapshots.json' with { type: 'json' };
import { logMetadata, type LogEntry } from './log';
import { validateProjection, type TextProjection } from './text-projection';
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const schema = z.strictObject({
  format: z.literal('onur-memento-v1'),
  logId: z.string().regex(/^[a-z]+-[a-z]+-[a-z]+$/),
  version: z.number().int().positive(),
  publishedAt: z.iso.datetime({ offset: true }),
  archivedAt: z.iso.datetime({ offset: true }),
  kind: z.enum(['reconstructed', 'captured']),
  revisionHash: digest,
  projectionVersion: z.literal('onur-text-v1'),
  projectionHash: digest,
  html: z.string(),
  htmlHash: digest,
  media: z.array(z.strictObject({ source: z.string(), sha256: digest })),
});
export type MementoSnapshot = z.infer<typeof schema>;
const hash = (text: string | Uint8Array) =>
  createHash('sha256').update(text).digest('hex');
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] ?? c,
  );
export function validateSnapshot(input: unknown): MementoSnapshot {
  const s = schema.parse(input);
  if (
    hash(s.html) !== s.htmlHash ||
    Date.parse(s.archivedAt) < Date.parse(s.publishedAt) ||
    new Date(s.archivedAt).getUTCMilliseconds() !== 0
  )
    throw new Error('Corrupt Memento snapshot');
  return s;
}
export async function createSnapshot(
  entry: LogEntry,
  version: number,
  projection: TextProjection,
  archivedAt: string,
  kind: MementoSnapshot['kind'],
  asset: (source: string) => Promise<{ bytes: Uint8Array; type: string }>,
  mathCss = '',
): Promise<MementoSnapshot> {
  validateProjection(projection);
  const revision = entry.revisions.find((r) => r.version === version);
  if (!revision) throw new Error('Unknown revision');
  const metadata = logMetadata(entry, version);
  const tree = fromHtml(projection.render.html, { fragment: true });
  const media: MementoSnapshot['media'] = [];
  const pending: Promise<void>[] = [];
  visit(tree, 'element', (node) => {
    if (node.tagName !== 'img') return;
    const source = String(node.properties.src);
    pending.push(
      asset(source).then(({ bytes, type }) => {
        if (!/^image\/(png|jpeg|webp|gif|avif)$/.test(type))
          throw new Error('Snapshot images must be inert raster media');
        media.push({ source, sha256: hash(bytes) });
        node.properties.src = `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
        delete node.properties.srcSet;
      }),
    );
  });
  await Promise.all(pending);
  let cover = '';
  if (metadata.cover) {
    const { bytes, type } = await asset(metadata.cover.src);
    if (!/^image\/(png|jpeg|webp|gif|avif)$/.test(type))
      throw new Error('Snapshot cover must be inert raster media');
    media.push({ source: metadata.cover.src, sha256: hash(bytes) });
    cover = `<figure><img src="data:${type};base64,${Buffer.from(bytes).toString('base64')}" alt="${escape(metadata.cover.alt)}">${metadata.cover.caption ? `<figcaption>${escape(metadata.cover.caption)}</figcaption>` : ''}</figure>`;
  }
  const body = unified().use(rehypeStringify).stringify(tree);
  const css =
    'html{font:16px/1.8 "Helvetica Neue",Helvetica,Arial,sans-serif;color-scheme:light dark}body{max-width:960px;margin:48px auto;padding:0 24px}a{color:inherit}img{max-width:100%;height:auto}pre,table{overflow:auto}pre{white-space:pre-wrap}blockquote{border-left:1px solid;padding-left:24px}h1,h2,h3{font-weight:400}';
  if (/<\/style/i.test(mathCss)) throw new Error('Invalid math stylesheet');
  const sources = metadata.sources.length
    ? `<section id="log-sources"><h2>Sources</h2><ol>${metadata.sources.map((s, i) => `<li id="source-${String(i + 1)}"><a href="${escape(s.url)}">${escape(s.title)}</a></li>`).join('')}</ol></section>`
    : '';
  const html = `<!doctype html><html lang="${escape(metadata.language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escape(metadata.title)} ⁜ v${String(version)} ⁜ Onur</title><style>${css}${mathCss}</style></head><body><main><article><h1>${escape(metadata.title)}</h1><p>${kind === 'reconstructed' ? 'Reconstructed revision' : 'Captured revision'} ${String(version)} ⁜ Published <time datetime="${escape(revision.publishedAt)}">${escape(revision.publishedAt)}</time> ⁜ Archived <time datetime="${escape(archivedAt)}">${escape(archivedAt)}</time></p><p><a href="/log/${entry.id}">Current revision</a> ⁜ <a href="/log/${entry.id}/verified?v=${String(version)}">Publication evidence</a></p>${cover}<div id="${entry.id}-v${String(version)}-body" data-annotation-revision="${String(version)}" data-projection-version="onur-text-v1" data-projection-hash="${projection.projectionHash}">${body}</div>${sources}</article></main></body></html>`;
  return validateSnapshot({
    format: 'onur-memento-v1',
    logId: entry.id,
    version,
    publishedAt: revision.publishedAt,
    archivedAt,
    kind,
    revisionHash: projection.revisionHash,
    projectionVersion: projection.projectionVersion,
    projectionHash: projection.projectionHash,
    html,
    htmlHash: hash(html),
    media: media.sort((a, b) => a.source.localeCompare(b.source)),
  });
}
// The records are a static import, so hash every embedded snapshot once per process.
let validated: readonly MementoSnapshot[] | undefined;
export function snapshotsFor(id: string): MementoSnapshot[] {
  validated ??= Object.values(records as Record<string, unknown>).map(
    validateSnapshot,
  );
  return validated
    .filter((s) => s.logId === id)
    .toSorted(
      (a, b) =>
        Date.parse(a.archivedAt) - Date.parse(b.archivedAt) ||
        a.version - b.version,
    );
}
export function mementoPath(id: string, version: number) {
  return `/log/${id}/memento/v${String(version)}`;
}
export function mementoLinks(id: string, origin: string): string {
  const base = new URL(`/log/${id}`, origin).href;
  return `<${base}>; rel="original", <${base}/timegate>; rel="timegate", <${base}/timemap>; rel="timemap"; type="application/link-format"`;
}
export function selectMemento(
  snapshots: readonly MementoSnapshot[],
  datetime: string | null,
  now = Date.now(),
): MementoSnapshot | null {
  let at = now;
  if (datetime !== null) {
    at = Date.parse(datetime);
    if (!Number.isFinite(at) || new Date(at).toUTCString() !== datetime)
      throw new Error('Accept-Datetime requires an IMF-fixdate UTC HTTP-date');
  }
  return (
    snapshots
      .filter((s) => Date.parse(s.archivedAt) <= at)
      .toSorted(
        (a, b) =>
          Date.parse(b.archivedAt) - Date.parse(a.archivedAt) ||
          b.version - a.version,
      )[0] ?? null
  );
}
export function timegateResponse(
  request: Request,
  id: string,
  snapshots: readonly MementoSnapshot[],
): Response {
  const origin = new URL(request.url).origin;
  const headers = new Headers({
    Vary: 'Accept-Datetime',
    'Cache-Control': 'no-store',
    Link: mementoLinks(id, origin),
  });
  try {
    const selected = selectMemento(
      snapshots,
      request.headers.get('Accept-Datetime'),
    );
    if (!selected) return new Response(null, { status: 404, headers });
    headers.set(
      'Location',
      new URL(mementoPath(id, selected.version), origin).href,
    );
    return new Response(null, { status: 302, headers });
  } catch {
    return new Response(null, { status: 400, headers });
  }
}
export function timeMap(
  id: string,
  snapshots: readonly MementoSnapshot[],
  origin: string,
): string {
  return (
    mementoLinks(id, origin) +
    snapshots
      .map(
        (s) =>
          `,\n<${new URL(mementoPath(id, s.version), origin).href}>; rel="memento"; datetime="${new Date(s.archivedAt).toUTCString()}"`,
      )
      .join('') +
    '\n'
  );
}
export function mementoResponse(
  request: Request,
  snapshot: MementoSnapshot,
  origin: string,
): Response {
  const s = validateSnapshot(snapshot);
  return new Response(request.method === 'HEAD' ? null : s.html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Memento-Datetime': new Date(s.archivedAt).toUTCString(),
      Link: mementoLinks(s.logId, origin),
      ETag: `"${s.htmlHash}"`,
      'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

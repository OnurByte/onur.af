import { createHash } from 'node:crypto';
import { fromHtml } from 'hast-util-from-html';
import type { Root, RootContent } from 'hast';
import { z } from 'astro/zod';
import records from '../content/log-projections.json' with { type: 'json' };
import { logMetadata, revisionMarkdown, type LogEntry } from './log';
import { renderLogContent } from './log-markdown';

export const projectionText = (html: string): string => {
  function text(node: Root | RootContent): string {
    if (node.type === 'text') return node.value;
    if ('children' in node) {
      if (
        node.type === 'element' &&
        ['button', 'template'].includes(node.tagName)
      )
        return '';
      return node.children.map(text).join('');
    }
    return '';
  }
  return text(fromHtml(html, { fragment: true }));
};
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const renderSchema = z.strictObject({
  html: z.string(),
  headings: z.array(
    z.strictObject({
      id: z.string(),
      text: z.string(),
      depth: z.number().int(),
    }),
  ),
  links: z.array(z.string()),
  images: z.array(z.string()),
  sourceReferences: z.array(
    z.strictObject({ source: z.number().int(), id: z.string() }),
  ),
});
const projectionSchema = z.strictObject({
  projectionVersion: z.literal('onur-text-v1'),
  revisionHash: digest,
  projectionHash: digest,
  text: z.string(),
  render: renderSchema,
  archivedRender: renderSchema,
  renderHash: digest,
  archivedRenderHash: digest,
});
export type TextProjection = z.infer<typeof projectionSchema>;
/** v1 is DOM textContent in UTF-16 with generated button/template controls excluded. */
export function createProjection(
  revisionHash: string,
  body: string,
  id: string,
  version: number,
  sourceCount: number,
): TextProjection {
  const render = renderLogContent(body, '', sourceCount);
  const archivedRender = renderLogContent(
    body,
    `${id}-v${String(version)}-`,
    sourceCount,
  );
  const text = projectionText(render.html);
  return validateProjection({
    projectionVersion: 'onur-text-v1',
    revisionHash,
    projectionHash: hash(text),
    text,
    render,
    archivedRender,
    renderHash: hash(JSON.stringify(render)),
    archivedRenderHash: hash(JSON.stringify(archivedRender)),
  });
}
export function validateProjection(input: unknown): TextProjection {
  const p = projectionSchema.parse(input);
  if (
    hash(p.text) !== p.projectionHash ||
    projectionText(p.render.html) !== p.text ||
    projectionText(p.archivedRender.html) !== p.text ||
    hash(JSON.stringify(p.render)) !== p.renderHash ||
    hash(JSON.stringify(p.archivedRender)) !== p.archivedRenderHash
  )
    throw new Error('Corrupt frozen text projection');
  return p;
}
// Frozen records are a static import; rehash each record's renders once per process.
const validRecords = new Map<string, TextProjection>();
export function revisionProjection(
  entry: LogEntry,
  version: number,
): TextProjection {
  const key = `${entry.id}-v${String(version)}`;
  let p = validRecords.get(key);
  if (!p) {
    const value: unknown = (records as Record<string, unknown>)[key];
    if (!value)
      throw new Error(
        `Missing frozen projection: ${key}. Run log:projections prepare.`,
      );
    p = validateProjection(value);
    validRecords.set(key, p);
  }
  // The signed binding is checked on every call against the entry supplied.
  if (p.revisionHash !== hash(revisionMarkdown(entry, version)))
    throw new Error('Frozen projection does not match signed revision');
  return p;
}
export function freezeProjection(
  entry: LogEntry,
  version: number,
): TextProjection {
  const revision = entry.revisions.find((r) => r.version === version);
  if (!revision) throw new Error('Unknown revision');
  return createProjection(
    hash(revisionMarkdown(entry, version)),
    revision.body,
    entry.id,
    version,
    logMetadata(entry, version).sources.length,
  );
}

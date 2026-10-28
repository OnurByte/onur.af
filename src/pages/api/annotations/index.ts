import {
  readRequestBody,
  RequestBodyTooLarge,
} from '../../../server/request-body';
import { requestLimitKey, takeRateLimit } from '../../../server/request-limits';
import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { getLogEntryById, revisionMarkdown } from '../../../portfolio/log';
import { renderLogContent } from '../../../portfolio/log-markdown';
import {
  annotationStore,
  annotationsEnabled,
} from '../../../server/annotations/service';
import { z } from 'astro/zod';
import { annotationSchema } from '../../../portfolio/annotations/protocol';
import { verifyAnnotation } from '../../../server/annotations/signature';
import { resolveSelection } from '../../../portfolio/annotations/protocol';
import { jsonResponse } from '../../../server/http';
import { fromHtml } from 'hast-util-from-html';
import type { Nodes } from 'hast';
function textContent(node: Nodes): string {
  return node.type === 'text'
    ? node.value
    : 'children' in node
      ? node.children.map(textContent).join('')
      : '';
}
export const GET: APIRoute = async ({ url }) => {
  if (!annotationsEnabled())
    return jsonResponse({ error: 'Annotations disabled' }, 503);
  const id = url.searchParams.get('log');
  const version = Number(url.searchParams.get('v'));
  const entry = getLogEntryById(id ?? undefined);
  if (!entry?.revisions.some((r) => r.version === version))
    return jsonResponse({ error: 'Unknown revision' }, 404);
  try {
    return jsonResponse(
      { annotations: await annotationStore().visible(entry.id, version) },
      200,
      false,
    );
  } catch {
    return jsonResponse({ error: 'Annotations unavailable' }, 503);
  }
};
export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  if (!annotationsEnabled())
    return jsonResponse({ error: 'Annotations disabled' }, 503);
  if (
    request.headers.get('origin') !== url.origin ||
    !request.headers.get('content-type')?.startsWith('application/json')
  )
    return jsonResponse({ error: 'Invalid request' }, 403);
  try {
    const rateSecret =
      process.env['ANNOTATIONS_RATE_SECRET'] ??
      import.meta.env['ANNOTATIONS_RATE_SECRET'];
    if (!rateSecret || rateSecret.length < 32)
      return jsonResponse({ error: 'Annotations unavailable' }, 503);
    if (
      !(await takeRateLimit(
        annotationStore().pool,
        requestLimitKey(rateSecret, clientAddress),
        30,
        'annotation_request_limits',
      ))
    )
      return jsonResponse({ error: 'Annotation rate limit' }, 429);
    const bytes = await readRequestBody(request, 512_000);
    if (bytes === null) return jsonResponse({ error: 'Invalid request' }, 400);
    const body = z
      .object({
        payload: annotationSchema,
        signature: z.string().max(256),
      })
      .parse(JSON.parse(Buffer.from(bytes).toString('utf8')));
    if (!verifyAnnotation(body.payload, body.signature))
      return jsonResponse({ error: 'Invalid annotation signature' }, 400);
    const p = body.payload;
    if (p.action === 'create' && !p.pgpPublicKey)
      return jsonResponse({ error: 'PGP public key required' }, 400);
    const entry = getLogEntryById(p.logId);
    const revision = entry?.revisions.find((r) => r.version === p.revision);
    if (
      !entry ||
      !revision ||
      createHash('sha256')
        .update(revisionMarkdown(entry, p.revision))
        .digest('hex') !== p.revisionHash
    )
      return jsonResponse({ error: 'Unknown signed revision' }, 400);
    const html = renderLogContent(revision.body, '', 0).html;
    // The DOM text protocol is textContent, not layout-aware innerText.
    const text = textContent(fromHtml(html, { fragment: true }));
    if (!resolveSelection(text, p.target))
      return jsonResponse({ error: 'Selection does not match revision' }, 400);
    await annotationStore().submit(p, body.signature);
    return jsonResponse(
      {
        status:
          p.action === 'withdraw'
            ? 'withdrawn'
            : p.action === 'report'
              ? 'reported'
              : 'published',
      },
      201,
    );
  } catch (error) {
    if (error instanceof RequestBodyTooLarge)
      return jsonResponse({ error: 'Request too large' }, 413);
    return jsonResponse({ error: 'Annotation unavailable or invalid' }, 400);
  }
};

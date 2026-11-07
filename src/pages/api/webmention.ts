import type { APIRoute } from 'astro';
import { resolveMentionTarget } from '../../portfolio/inbound-webmention';
import { validatePublicUrl } from '../../portfolio/public-request';
import { siteOrigin } from '../../portfolio/seo';
import {
  webmentionsEnabled,
  webmentionStore,
} from '../../server/webmentions/service';
import {
  readRequestBody,
  RequestBodyTooLarge,
} from '../../server/request-body';
import { requestLimitKey } from '../../server/request-limits';
import { jsonResponse } from '../../server/http';
export async function handleWebmention({
  request,
  clientAddress,
  site,
}: {
  request: Request;
  clientAddress: string;
  site: URL | undefined;
}): Promise<Response> {
  if (!webmentionsEnabled())
    return jsonResponse({ error: 'Webmentions disabled' }, 503);
  if (
    request.headers.get('content-type')?.split(';')[0]?.trim() !==
    'application/x-www-form-urlencoded'
  )
    return jsonResponse({ error: 'Expected form data' }, 415);
  try {
    const secret =
      process.env['WEBMENTIONS_RATE_SECRET'] ??
      import.meta.env['WEBMENTIONS_RATE_SECRET'];
    if (!secret || secret.length < 32)
      return jsonResponse({ error: 'Webmentions unavailable' }, 503);
    const store = webmentionStore();
    if (!(await store.limit(requestLimitKey(secret, clientAddress))))
      return jsonResponse({ error: 'Too many notifications' }, 429);
    const bytes = await readRequestBody(request, 8192);
    if (!bytes)
      return jsonResponse({ error: 'Source and target required' }, 400);
    const encoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    // URLSearchParams replaces malformed percent escapes; protocol input must fail closed.
    decodeURIComponent(encoded.replace(/\+/g, ' '));
    const form = new URLSearchParams(encoded);
    if (
      form.getAll('source').length !== 1 ||
      form.getAll('target').length !== 1
    )
      return jsonResponse({ error: 'Source and target required' }, 400);
    const source = form.get('source') ?? '';
    const rawTarget = form.get('target') ?? '';
    if (
      source.length > 2048 ||
      rawTarget.length > 2048 ||
      Array.from(source).some(
        (character) =>
          character.charCodeAt(0) <= 32 ||
          character.charCodeAt(0) === 127 ||
          character === '\\',
      )
    )
      return jsonResponse({ error: 'Invalid URL' }, 400);
    const canonicalSource = validatePublicUrl(source).href;
    const origin = siteOrigin(site);
    const target = origin ? resolveMentionTarget(rawTarget, origin) : null;
    if (!target || canonicalSource === target.url)
      return jsonResponse({ error: 'Unsupported target' }, 400);
    await store.enqueue(canonicalSource, target);
    return jsonResponse({ status: 'queued' }, 202);
  } catch (error) {
    if (error instanceof RequestBodyTooLarge)
      return jsonResponse({ error: 'Request too large' }, 413);
    return jsonResponse({ error: 'Notification unavailable or invalid' }, 400);
  }
}
export const POST: APIRoute = handleWebmention;

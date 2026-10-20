import { publicPreview } from './previews';
import { validSiteUrl } from './seo';
import { parseRssEntries, type RssEntry } from './rss-entries';

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function rssXml(
  origin: string | undefined,
  entries: readonly RssEntry[] = [],
): string | undefined {
  const validOrigin =
    validSiteUrl(origin) ??
    (origin &&
    URL.canParse(origin) &&
    /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\/?$/.test(origin)
      ? new URL(origin).origin
      : undefined);
  if (!validOrigin) return;
  const description = escapeXml(publicPreview('/rss')!.description);
  const items = parseRssEntries(entries)
    .map(
      (entry) =>
        `<item><title>${escapeXml(entry.title)}</title><link>${escapeXml(new URL(entry.url, validOrigin).href)}</link><guid isPermaLink="false">urn:onur:post:${entry.id}</guid><description>${escapeXml(entry.summary)}</description><pubDate>${new Date(entry.publishedAt).toUTCString()}</pubDate></item>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Onur ⁜ RSS</title><link>${escapeXml(validOrigin)}/rss</link><description>${description}</description><language>en</language>${items}</channel></rss>`;
}

export function wantsFeedHtml(accept: string | null): boolean {
  let html = 0;
  let xml = 0;
  for (const range of (accept ?? '').toLowerCase().split(',')) {
    const [type = '', ...parameters] = range.trim().split(';');
    const quality = parameters.find((parameter) =>
      parameter.trim().startsWith('q='),
    );
    const weight = quality ? Number(quality.trim().slice(2)) : 1;
    if (!Number.isFinite(weight) || weight <= 0 || weight > 1) continue;
    if (type.trim() === 'text/html') html = Math.max(html, weight);
    if (
      ['application/rss+xml', 'application/xml', 'text/xml'].includes(
        type.trim(),
      )
    ) {
      xml = Math.max(xml, weight);
    }
  }
  return html > xml;
}

export function rssResponse(
  origin: string | undefined,
  requestUrl?: URL,
  entries: readonly RssEntry[] = [],
): Response {
  const localOrigin =
    requestUrl &&
    ['localhost', '127.0.0.1', '[::1]'].includes(requestUrl.hostname)
      ? requestUrl.origin
      : undefined;
  const xml = rssXml(origin ?? localOrigin, entries);
  return new Response(
    xml ??
      'The feed is unavailable until the public site address is configured.',
    {
      status: xml ? 200 : 503,
      headers: {
        'Content-Type': xml
          ? 'text/xml; charset=utf-8'
          : 'text/plain; charset=utf-8',
        'X-Robots-Tag': 'noindex',
        'Content-Disposition': 'inline',
        Vary: 'Accept',
      },
    },
  );
}

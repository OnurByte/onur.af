import { notes, reading, type Note, type ReadingEntry } from './content';
import { validSiteUrl } from './seo';

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
  entries: Note[] = notes,
): string | undefined {
  const validOrigin =
    validSiteUrl(origin) ??
    (origin &&
    URL.canParse(origin) &&
    /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\/?$/.test(origin)
      ? new URL(origin).origin
      : undefined);
  if (!validOrigin) return;
  const items = entries
    .map((note) => {
      const link = escapeXml(new URL(`/notes/${note.slug}`, validOrigin).href);
      return `<item><title>${escapeXml(note.title)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid><pubDate>${new Date(`${note.date}T00:00:00Z`).toUTCString()}</pubDate><description>${escapeXml(note.paragraphs.join('\n\n'))}</description></item>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Onur — Notes</title><link>${escapeXml(validOrigin)}/notes</link><description>Notes from Onur.</description><language>en</language>${items}</channel></rss>`;
}

export function wantsFeedHtml(accept: string | null): boolean {
  let html = 0;
  let xml = 0;
  for (const range of (accept ?? '').toLowerCase().split(',')) {
    const [type, ...parameters] = range.trim().split(';');
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
): Response {
  const localOrigin =
    requestUrl &&
    ['localhost', '127.0.0.1', '[::1]'].includes(requestUrl.hostname)
      ? requestUrl.origin
      : undefined;
  const xml = rssXml(origin ?? localOrigin);
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

export function opmlXml(entries: ReadingEntry[] = reading): string {
  const feeds = entries
    .filter((entry) => entry.feed)
    .map(
      (entry) =>
        `<outline text="${escapeXml(entry.name)}" title="${escapeXml(entry.name)}" type="rss" xmlUrl="${escapeXml(entry.feed!)}" htmlUrl="${escapeXml(entry.url)}"/>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><opml version="2.0"><head><title>Onur — Recommended feeds</title></head><body>${feeds}</body></opml>`;
}

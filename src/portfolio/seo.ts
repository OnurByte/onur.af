import {
  logEntries,
  listedLogEntries,
  isListedLogEntry,
  logProofUrl,
  logUrl,
  logMetadata,
  type LogEntry,
} from './log';
import { logTagDefinitions } from './log';
import { logTags, logTagUrl } from './log-tags';
export const publicPaths: readonly string[] = [
  '/',
  '/contribute',
  '/rss',
  '/pgp',
  '/log',
];
export const proofPaths = ['/pgp/x', '/pgp/github'] as const;
export const logPaths = (entries: readonly LogEntry[] = logEntries) =>
  entries.flatMap((entry) => [logUrl(entry), logProofUrl(entry)]);
export const siteDescription = '';

export function validSiteUrl(value: string | undefined): string | undefined {
  if (!value || /[\u0000-\u0020\u007f\\]/.test(value)) return;
  try {
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      return;
    const host = url.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host === '[::1]' ||
      host === '0.0.0.0' ||
      host.startsWith('127.')
    )
      return;
    return url.origin;
  } catch {
    return;
  }
}

export function resolveSiteOrigin(
  value: string | undefined,
  fallback: string | URL | undefined,
): string | undefined {
  return validSiteUrl(value || fallback?.toString());
}
export function siteOrigin(fallback?: string | URL): string | undefined {
  return resolveSiteOrigin(
    process.env['SITE_URL'] ?? import.meta.env?.['SITE_URL'],
    fallback,
  );
}
function isPublicPage(pathname: string): boolean {
  return (
    publicPaths.includes(pathname) ||
    proofPaths.some((path) => path === pathname) ||
    logPaths().includes(pathname) ||
    Object.keys(logTagDefinitions).some((slug) => logTagUrl(slug) === pathname)
  );
}
/** Indexability is a page policy, independent of whether an absolute canonical origin is configured. */
export function robotsContent(
  pathname: string,
  options: { noindex?: boolean; status?: number } = {},
): string {
  if ((options.status ?? 200) !== 200 || !isPublicPage(pathname))
    return 'noindex, nofollow';
  const entry = logEntries.find(
    (entry) => logUrl(entry) === pathname || logProofUrl(entry) === pathname,
  );
  if (entry && !isListedLogEntry(entry)) return 'noindex, follow';
  const tag = logTags().find((tag) => logTagUrl(tag.slug) === pathname);
  return options.noindex ||
    (pathname.startsWith('/log/tag/') && (!tag || !tag.indexable))
    ? 'noindex, follow'
    : 'index, follow';
}

export function canonicalUrl(
  origin: string | undefined,
  pathname: string,
): string | undefined {
  if (!origin || !isPublicPage(pathname)) return;
  return new URL(pathname, origin).href;
}

export function sitemapXml(origin: string | undefined): string {
  const escape = (value: string) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  const urls = origin
    ? [
        ...publicPaths,
        ...proofPaths,
        ...logPaths(listedLogEntries),
        ...logTags()
          .filter((tag) => tag.indexable)
          .map((tag) => logTagUrl(tag.slug)),
      ]
        .map((path) => {
          const entry = logEntries.find(
            (entry) => logUrl(entry) === path || logProofUrl(entry) === path,
          );
          const tag = logTags().find((tag) => logTagUrl(tag.slug) === path);
          const updated =
            entry?.revisions.at(-1)?.publishedAt ??
            tag?.entries
              .map((entry) => entry.revisions.at(-1)!.publishedAt)
              .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
          return `<url><loc>${escape(new URL(path, origin).href)}</loc>${updated ? `<lastmod>${escape(updated)}</lastmod>` : ''}</url>`;
        })
        .join('')
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

export function logArticleSchema(origin: string | undefined, entry: LogEntry) {
  if (!origin) return;
  const metadata = logMetadata(entry);
  const url = new URL(logUrl(entry), origin).href;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#article`,
        headline: metadata.title,
        description: metadata.summary,
        url,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        datePublished: entry.revisions[0]!.publishedAt,
        dateModified: entry.revisions.at(-1)!.publishedAt,
        inLanguage: metadata.language,
        keywords: metadata.tags,
        author: { '@type': 'Person', name: 'Onur', url: `${origin}/` },
        ...(metadata.cover
          ? { image: new URL(metadata.cover.src, origin).href }
          : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${origin}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Log',
            item: `${origin}/log`,
          },
          { '@type': 'ListItem', position: 3, name: metadata.title, item: url },
        ],
      },
    ],
  };
}

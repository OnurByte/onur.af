import { logEntries, logProofUrl, logUrl } from './log';
export const publicPaths: readonly string[] = [
  '/',
  '/donate',
  '/rss',
  '/pgp',
  '/log',
];
export const proofPaths = ['/pgp/x', '/pgp/github', '/pgp/log'] as const;
export const logPaths = () =>
  logEntries.flatMap((entry) => [logUrl(entry), logProofUrl(entry)]);
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

export function siteOrigin(): string | undefined {
  return validSiteUrl(process.env.SITE_URL ?? import.meta.env?.SITE_URL);
}

export function canonicalUrl(
  origin: string | undefined,
  pathname: string,
): string | undefined {
  if (
    !origin ||
    (!publicPaths.includes(pathname) &&
      !proofPaths.some((path) => path === pathname) &&
      !logPaths().includes(pathname))
  )
    return;
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
    ? [...publicPaths, ...proofPaths, ...logPaths()]
        .map(
          (path) =>
            `<url><loc>${escape(new URL(path, origin).href)}</loc></url>`,
        )
        .join('')
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

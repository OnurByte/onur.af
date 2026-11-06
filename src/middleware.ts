import { debugLog } from './server/debug-log';
import { defineMiddleware } from 'astro:middleware';
import { publicPathRedirect } from './portfolio/seo';
import { compressHtml } from './server/html-compression';
import { getLogEntryById, isListedLogEntry } from './portfolio/log';
import { mementoLinks } from './portfolio/memento';
import { parseLogPagePath } from './portfolio/quote-link';
import { webmentionsEnabled } from './server/webmentions/service';
import {
  assertPublicationReadable,
  withPublicationRead,
} from './portfolio/publication-transaction';
export const onRequest = defineMiddleware(async (context, next) => {
  const method = context.request.method;
  const route = context.routePattern;
  const diagnostic = { method, route };
  let response: Response;
  try {
    // Build-time URLs can end in `/`; redirecting here would bake a self-redirect
    // into the static HTML that Vercel serves with status 200.
    if (!context.isPrerendered && (method === 'GET' || method === 'HEAD')) {
      const pathname = publicPathRedirect(context.url.pathname);
      if (pathname) {
        await debugLog({
          ...diagnostic,
          event: 'http.redirect',
          level: 'info',
          status: 308,
        });
        return context.redirect(`${pathname}${context.url.search}`, 308);
      }
    }
    // A serverless deployment has no local publisher and may have a read-only filesystem.
    if (process.env['VERCEL']) response = await next();
    else {
      await assertPublicationReadable(process.cwd());
      response = await withPublicationRead(process.cwd(), next);
      response = compressHtml(context.request, response, (error) => {
        void debugLog({
          ...diagnostic,
          event: 'response.stream-error',
          level: 'error',
          status: response.status,
          error,
        });
      });
    }
  } catch (error) {
    if (
      !process.env['VERCEL'] &&
      error instanceof Error &&
      /publication|recovery|writer|lock|journal/i.test(error.message)
    ) {
      await debugLog({
        ...diagnostic,
        event: 'publication.unavailable',
        level: 'warn',
        status: 503,
        error,
      });
      return new Response(
        'Publication update in progress. Please retry shortly.',
        {
          status: 503,
          headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' },
        },
      );
    }
    await debugLog({
      ...diagnostic,
      event: 'http.exception',
      level: 'error',
      status: 500,
      error,
    });
    throw error;
  }
  if (response.status === 200 && (method === 'GET' || method === 'HEAD')) {
    const path = parseLogPagePath(context.url.pathname);
    const entry = getLogEntryById(path?.id);
    if (entry) {
      if (!path?.quote)
        response.headers.append(
          'Link',
          mementoLinks(entry.id, context.url.origin),
        );
      if (webmentionsEnabled() && isListedLogEntry(entry))
        response.headers.append(
          'Link',
          `<${new URL('/api/webmention', context.url.origin).href}>; rel="webmention"`,
        );
    }
  }
  if (response.status >= 400) {
    await debugLog({
      ...diagnostic,
      event: 'http.response',
      level: response.status >= 500 ? 'error' : 'warn',
      status: response.status,
    });
  }
  return response;
});

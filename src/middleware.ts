import { defineMiddleware } from 'astro:middleware';
import { publicPathRedirect } from './portfolio/seo';
import { compressHtml } from './server/html-compression';
import {
  assertPublicationReadable,
  withPublicationRead,
} from './portfolio/publication-transaction';
export const onRequest = defineMiddleware(async (context, next) => {
  if (context.request.method === 'GET' || context.request.method === 'HEAD') {
    const pathname = publicPathRedirect(context.url.pathname);
    if (pathname)
      return context.redirect(`${pathname}${context.url.search}`, 308);
  }
  // A serverless deployment has no local publisher and may have a read-only filesystem.
  if (process.env['VERCEL']) return next();
  try {
    await assertPublicationReadable(process.cwd());
    const response = await withPublicationRead(process.cwd(), next);
    return compressHtml(context.request, response);
  } catch (error) {
    if (
      error instanceof Error &&
      /publication|recovery|writer|lock|journal/i.test(error.message)
    )
      return new Response(
        'Publication update in progress. Please retry shortly.',
        {
          status: 503,
          headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' },
        },
      );
    throw error;
  }
});

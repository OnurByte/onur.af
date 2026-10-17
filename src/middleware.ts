import { defineMiddleware } from 'astro:middleware';
import {
  assertPublicationReadable,
  withPublicationRead,
} from './portfolio/publication-transaction';
export const onRequest = defineMiddleware(async (_context, next) => {
  // A serverless deployment has no local publisher and may have a read-only filesystem.
  if (process.env['VERCEL']) return next();
  try {
    await assertPublicationReadable(process.cwd());
    return await withPublicationRead(process.cwd(), next);
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

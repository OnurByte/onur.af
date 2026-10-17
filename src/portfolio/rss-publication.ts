import { rssResponse } from './feeds';
import type { RssEntry } from './rss-entries';
import {
  verifyRssSignature,
  type VerifiedRssSignature,
} from './rss-signatures';
import type { KeyTrust } from './key-history';

export interface RssPublication {
  response: Response;
  verification: VerifiedRssSignature | { status: 'invalid' | 'unavailable' };
}
/** Resolve XML and signature together. Never expose a signature for different bytes. */
export async function resolveRssPublication(
  origin: string | undefined,
  requestUrl: URL | undefined,
  entries: readonly RssEntry[],
  artifact: unknown,
  publicKey: string | KeyTrust,
): Promise<RssPublication> {
  const response = rssResponse(origin, requestUrl, entries);
  response.headers.set('Cache-Control', 'no-cache, no-transform');
  if (response.status !== 200)
    return { response, verification: { status: 'unavailable' } };
  try {
    const xml = await response.clone().text();
    const verification = await verifyRssSignature(xml, artifact, publicKey);
    if (verification.status === 'signed') {
      const servedOrigin = origin ?? requestUrl?.origin;
      if (verification.origin !== servedOrigin)
        throw new Error('RSS signature origin mismatch');
      response.headers.set(
        'Link',
        '</rss.xml.asc>; rel="describedby"; type="application/pgp-signature", </pgp.asc>; rel="related"; type="application/pgp-keys"',
      );
    }
    return { response, verification };
  } catch {
    return {
      response: new Response(
        'The feed signature needs to be refreshed before publication.',
        {
          status: 503,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'noindex',
            Vary: 'Accept',
          },
        },
      ),
      verification: { status: 'invalid' },
    };
  }
}

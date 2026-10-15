import publicKey from '../../public/pgp.asc?raw';
import artifact from '../content/rss-signature.json';
import { rssEntries } from './rss-entries';
import { resolveRssPublication } from './rss-publication';
import { siteOrigin } from './seo';

// Verification promises are reused; callers get independent Response bodies.
let cached:
  | {
      origin: string | undefined;
      result: ReturnType<typeof resolveRssPublication>;
    }
  | undefined;
export async function getRssPublication(requestUrl: URL) {
  const origin = siteOrigin();
  const effectiveOrigin =
    origin ??
    (['localhost', '127.0.0.1', '[::1]'].includes(requestUrl.hostname)
      ? requestUrl.origin
      : undefined);
  if (!cached || cached.origin !== effectiveOrigin) {
    cached = {
      origin: effectiveOrigin,
      result: resolveRssPublication(
        origin,
        requestUrl,
        rssEntries,
        artifact,
        publicKey,
      ),
    };
  }
  const publication = await cached.result;
  return { ...publication, response: publication.response.clone() };
}

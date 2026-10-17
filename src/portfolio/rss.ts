import publicKey from '../../public/pgp.asc?raw';
import artifact from '../content/rss-signature.json';
import { rssEntries } from './rss-entries';
import { resolveRssPublication } from './rss-publication';
import { siteOrigin } from './seo';
import { configuredKeyHistory, loadConfiguredKeyTrust } from './key-history';
const keyTrust = loadConfiguredKeyTrust(publicKey, configuredKeyHistory);

// Verification promises are reused; callers get independent Response bodies.
let cached:
  | {
      origin: string | undefined;
      result: ReturnType<typeof resolveRssPublication>;
    }
  | undefined;
export async function getRssPublication(requestUrl: URL, configuredSite?: URL) {
  const trust = await keyTrust;
  const origin = siteOrigin(configuredSite);
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
        trust,
      ),
    };
  }
  const publication = await cached.result;
  return { ...publication, response: publication.response.clone() };
}

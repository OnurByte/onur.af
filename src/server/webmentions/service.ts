import { Pool } from 'pg';
import { WebmentionStore, type VisibleMention } from './store';
export function webmentionsEnabled(): boolean {
  return (
    (process.env['WEBMENTIONS_ENABLED'] ??
      import.meta.env['WEBMENTIONS_ENABLED']) === '1'
  );
}
let store: WebmentionStore | undefined;
export function webmentionStore(): WebmentionStore {
  if (!webmentionsEnabled()) throw new Error('Webmentions disabled');
  const url =
    process.env['WEBMENTIONS_DATABASE_URL'] ??
    import.meta.env['WEBMENTIONS_DATABASE_URL'];
  if (!url) throw new Error('Webmentions unavailable');
  return (store ??= new WebmentionStore(
    new Pool({
      connectionString: url,
      max: 3,
      connectionTimeoutMillis: 3000,
      statement_timeout: 5000,
    }),
  ));
}

/** The optional receiver may be misconfigured or unavailable without breaking reading. */
export async function visibleWebmentions(
  logId: string,
): Promise<VisibleMention[]> {
  try {
    if (!webmentionsEnabled()) return [];
    return await webmentionStore().visible(logId);
  } catch {
    return [];
  }
}

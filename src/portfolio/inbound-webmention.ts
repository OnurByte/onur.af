import { fromHtml } from 'hast-util-from-html';
import { visit } from 'unist-util-visit';
import { getLogEntryById, isListedLogEntry } from './log';
import { logQuote } from './log-quote';
import { parseLogPagePath } from './quote-link';
import { publicRequest, validatePublicUrl } from './public-request';
export interface MentionTarget {
  url: string;
  logId: string;
  kind: 'article' | 'passage';
}
/** Deliberately reject aliases, queries, fragments and encoded paths. */
export function resolveMentionTarget(
  value: string,
  origin: string,
): MentionTarget | null {
  try {
    const url = new URL(value);
    if (
      url.origin !== origin ||
      url.href !== value ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    )
      return null;
    const path = parseLogPagePath(url.pathname);
    const entry = getLogEntryById(path?.id);
    if (
      !path ||
      !entry ||
      !isListedLogEntry(entry) ||
      (path.quote && !logQuote(entry.id, path.quote))
    )
      return null;
    return {
      url: value,
      logId: entry.id,
      kind: path.quote ? 'passage' : 'article',
    };
  } catch {
    return null;
  }
}
type MentionStatus =
  'queued' | 'fetching' | 'validated' | 'rejected' | 'unreachable' | 'removed';
export interface MentionValidation {
  status: Exclude<MentionStatus, 'queued' | 'fetching'>;
  finalUrl?: string;
  title?: string;
}
export async function validateMention(
  source: string,
  target: string,
  request: (url: string) => Promise<Response> = publicRequest,
): Promise<MentionValidation> {
  try {
    validatePublicUrl(source);
  } catch {
    return { status: 'rejected' };
  }
  try {
    const response = await request(source);
    const finalUrl = validatePublicUrl(response.url || source).href;
    if ([404, 410].includes(response.status))
      return { status: 'removed', finalUrl };
    if (!response.ok) return { status: 'unreachable', finalUrl };
    if (!/^text\/html(?:;|$)/i.test(response.headers.get('content-type') ?? ''))
      return { status: 'rejected', finalUrl };
    const html = await response.text();
    if (Buffer.byteLength(html) > 2_000_000)
      return { status: 'rejected', finalUrl };
    const tree = fromHtml(html);
    let base = finalUrl;
    let baseFound = false;
    let title = '';
    const linked = new Set<string>();
    visit(tree, 'element', (node) => {
      if (
        node.tagName === 'base' &&
        !baseFound &&
        typeof node.properties.href === 'string'
      ) {
        baseFound = true;
        try {
          base = new URL(node.properties.href, finalUrl).href;
        } catch {
          /* Invalid base uses document URL. */
        }
      }
    });
    visit(tree, 'element', (node) => {
      if (node.tagName === 'title' && !title)
        title = node.children
          .filter((c) => c.type === 'text')
          .map((c) => c.value)
          .join('')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 300);
      if (
        !['a', 'link', 'area'].includes(node.tagName) ||
        typeof node.properties.href !== 'string'
      )
        return;
      try {
        if (new URL(node.properties.href, base).href === target)
          linked.add(target);
      } catch {
        /* Ignore malformed links. */
      }
    });
    return {
      status: linked.has(target) ? 'validated' : 'removed',
      finalUrl,
      title,
    };
  } catch {
    return { status: 'unreachable' };
  }
}

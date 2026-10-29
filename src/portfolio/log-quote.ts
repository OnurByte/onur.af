import { fromHtml } from 'hast-util-from-html';
import type { Root, RootContent } from 'hast';
import { getLogEntryById, logMetadata } from './log';
import { renderLogContent } from './log-markdown';
import { parseQuoteRange } from './quote-link';

export function renderedQuoteText(html: string): string {
  function text(node: Root | RootContent): string {
    if (node.type === 'text') return node.value;
    if ('children' in node) {
      if (
        node.type === 'element' &&
        ['button', 'template'].includes(node.tagName)
      )
        return '';
      return node.children.map(text).join('');
    }
    return '';
  }
  return text(fromHtml(html, { fragment: true }));
}
export function logQuote(id: string | undefined, selector: string | undefined) {
  const range = parseQuoteRange(selector);
  const entry = id ? getLogEntryById(id) : undefined;
  const revision = entry?.revisions.find(
    (item) => item.version === range?.revision,
  );
  if (!range || !entry || !revision) return null;
  const metadata = logMetadata(entry, revision.version);
  const html = renderLogContent(
    revision.body,
    '',
    metadata.sources.length,
  ).html;
  const text = renderedQuoteText(html);
  if (range.end > text.length) return null;
  // Never split a Unicode surrogate pair at a URL boundary.
  if (
    [range.start, range.end].some(
      (offset) =>
        /[\uD800-\uDBFF]/.test(text[offset - 1] ?? '') &&
        /[\uDC00-\uDFFF]/.test(text[offset] ?? ''),
    )
  )
    return null;
  const exact = text.slice(range.start, range.end);
  if (!exact.trim()) return null;
  const characters = Array.from(exact.replace(/\s+/g, ' ').trim());
  const description = `“${characters.slice(0, 250).join('')}${characters.length > 250 ? '…' : ''}”`;
  return { ...range, entry, revision, metadata, text: exact, description };
}

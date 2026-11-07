import { getLogEntryById, logMetadata } from './log';
import { revisionProjection } from './text-projection';
import { parseQuoteRange } from './quote-link';

export { projectionText as renderedQuoteText } from './text-projection';
export function logQuote(id: string | undefined, selector: string | undefined) {
  const range = parseQuoteRange(selector);
  const entry = id ? getLogEntryById(id) : undefined;
  const revision = entry?.revisions.find(
    (item) => item.version === range?.revision,
  );
  if (!range || !entry || !revision) return null;
  const metadata = logMetadata(entry, revision.version);
  const text = revisionProjection(entry, revision.version).text;
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

import {
  resolveSelection,
  type TextTarget,
  type AnnotationPayload,
} from './protocol';
/** Only use on the already verified same revision. Never migrate notes to another revision. */
export function locateAnnotation(
  text: string,
  target: TextTarget,
): { start: number; end: number } | null {
  const precise = resolveSelection(text, target);
  if (precise) return precise;
  const { exact, prefix, suffix } = target.quote;
  if (!exact) return null;
  let match: { start: number; end: number } | null = null;
  let cursor = 0;
  while (cursor <= text.length - exact.length) {
    const start = text.indexOf(exact, cursor);
    if (start < 0) break;
    const end = start + exact.length;
    cursor = start + 1;
    if (
      text.slice(Math.max(0, start - prefix.length), start) !== prefix ||
      text.slice(end, end + suffix.length) !== suffix
    )
      continue;
    if (match) return null;
    match = { start, end };
  }
  return match;
}
export function webAnnotation(
  note: AnnotationPayload,
  source: string,
  text: string,
) {
  const position = locateAnnotation(text, note.target);
  if (!position)
    throw new Error('Annotation target does not match this revision');
  const wellFormed = (value: string) =>
    value.replace(/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/g, '');
  return {
    '@context': 'http://www.w3.org/ns/anno.jsonld',
    id: `urn:uuid:${note.id}`,
    type: 'Annotation',
    motivation: 'commenting',
    body: { type: 'TextualBody', value: note.body, format: 'text/plain' },
    target: {
      type: 'SpecificResource',
      source,
      selector: [
        {
          type: 'TextQuoteSelector',
          exact: note.target.quote.exact,
          prefix: wellFormed(note.target.quote.prefix),
          suffix: wellFormed(note.target.quote.suffix),
        },
        {
          type: 'TextPositionSelector',
          start: Array.from(text.slice(0, position.start)).length,
          end: Array.from(text.slice(0, position.end)).length,
        },
      ],
    },
  };
}

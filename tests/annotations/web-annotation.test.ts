import { expect, test } from 'bun:test';
import {
  locateAnnotation,
  webAnnotation,
} from '../../src/portfolio/annotations/web-annotation';
import {
  anchorSelection,
  type AnnotationPayload,
} from '../../src/portfolio/annotations/protocol';
test('context fallback resolves one quoted range and rejects ambiguous repeated quotes', () => {
  const target = anchorSelection('before selected after', 7, 15);
  expect(locateAnnotation('UI before selected after', target)).toEqual({
    start: 10,
    end: 18,
  });
  const ambiguous = {
    normalization: 'onur-text-v1' as const,
    quote: { exact: 'same', prefix: '', suffix: '' },
    position: { start: 99, end: 103 },
  };
  expect(locateAnnotation('same and same', ambiguous)).toBeNull();
  expect(locateAnnotation('before changed after', target)).toBeNull();
});
test('Web Annotation export uses standard selectors and Unicode codepoint positions', () => {
  const text = 'a🙂 b';
  const note: AnnotationPayload = {
    format: 'onur-annotation-v1',
    id: crypto.randomUUID(),
    logId: 'example',
    revision: 2,
    revisionHash: 'ab'.repeat(32),
    target: anchorSelection(text, 4, 5),
    body: 'Plain note',
    action: 'create',
    sequence: 1,
    publicKey: 'public',
  };
  const exported = webAnnotation(
    note,
    'https://example.org/log/example#example-v2-body',
    text,
  );
  expect(exported.type).toBe('Annotation');
  expect(exported.target.selector[1]).toEqual({
    type: 'TextPositionSelector',
    start: 3,
    end: 4,
  });
  expect(exported.body.value).toBe('Plain note');
  expect(JSON.stringify(exported)).not.toContain('privateKey');
});

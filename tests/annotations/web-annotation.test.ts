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

test('Web Annotation TimeState binds export to the captured revision and projection', () => {
  const text = 'same 🙂 passage';
  const note: AnnotationPayload = {
    format: 'onur-annotation-v1',
    id: crypto.randomUUID(),
    logId: 'example',
    revision: 2,
    revisionHash: 'ab'.repeat(32),
    target: anchorSelection(text, 0, 4),
    body: 'Note',
    action: 'create',
    sequence: 1,
    publicKey: 'public',
  };
  const state = {
    revisionHash: note.revisionHash,
    projectionVersion: 'onur-text-v1',
    projectionHash: 'cd'.repeat(32),
    archivedAt: '2026-10-29T12:00:00Z',
    memento: 'https://onur.af/log/example/memento/v2',
  };
  const exported = webAnnotation(
    note,
    'https://onur.af/log/example',
    text,
    state,
  );
  expect(exported.target.state).toEqual({
    type: 'TimeState',
    sourceDate: state.archivedAt,
    cached: `${state.memento}#${note.logId}-v${String(note.revision)}-body`,
  });
  expect(exported.target['onur:revisionHash']).toBe(note.revisionHash);
  expect(exported.target['onur:projectionHash']).toBe(state.projectionHash);
  expect(exported.target['onur:projectionVersion']).toBe('onur-text-v1');
  expect(() =>
    webAnnotation(note, 'https://onur.af/log/example', text, {
      ...state,
      revisionHash: 'ef'.repeat(32),
    }),
  ).toThrow();
});

test('Web Annotation rejects a different Memento revision or projection resolver', () => {
  const text = 'passage';
  const note: AnnotationPayload = {
    format: 'onur-annotation-v1',
    id: crypto.randomUUID(),
    logId: 'example',
    revision: 2,
    revisionHash: 'ab'.repeat(32),
    target: anchorSelection(text, 0, 4),
    body: 'Note',
    action: 'create',
    sequence: 1,
    publicKey: 'public',
  };
  const state = {
    revisionHash: note.revisionHash,
    projectionVersion: 'onur-text-v1',
    projectionHash: 'cd'.repeat(32),
    archivedAt: '2026-10-29T12:00:00Z',
    memento: 'https://onur.af/log/example/memento/v1',
  };
  expect(() =>
    webAnnotation(note, 'https://onur.af/log/example', text, state),
  ).toThrow();
  expect(() =>
    webAnnotation(note, 'https://onur.af/log/example', text, {
      ...state,
      memento: 'https://onur.af/log/example/memento/v2',
      projectionVersion: 'unknown',
    }),
  ).toThrow();
});

test('Web Annotation accepts a Memento resolved on a non-canonical source origin', () => {
  const text = 'passage';
  const note: AnnotationPayload = {
    format: 'onur-annotation-v1',
    id: crypto.randomUUID(),
    logId: 'example',
    revision: 1,
    revisionHash: 'ab'.repeat(32),
    target: anchorSelection(text, 0, 4),
    body: 'Note',
    action: 'create',
    sequence: 1,
    publicKey: 'public',
  };
  const exported = webAnnotation(
    note,
    'http://localhost:4321/log/example',
    text,
    {
      revisionHash: note.revisionHash,
      projectionVersion: 'onur-text-v1',
      projectionHash: 'cd'.repeat(32),
      archivedAt: '2026-10-29T12:00:00Z',
      memento: 'http://localhost:4321/log/example/memento/v1',
    },
  );
  expect(exported.target.state?.cached).toBe(
    'http://localhost:4321/log/example/memento/v1#example-v1-body',
  );
});

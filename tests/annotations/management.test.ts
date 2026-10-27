import { expect, test } from 'bun:test';
import {
  mergeOwned,
  exportManagement,
  importManagement,
} from '../../src/portfolio/annotations/management';
import {
  anchorSelection,
  type AnnotationPayload,
} from '../../src/portfolio/annotations/protocol';
const note = (revision: number): AnnotationPayload => ({
  format: 'onur-annotation-v1',
  id: crypto.randomUUID(),
  logId: 'example',
  revision,
  revisionHash: 'ab'.repeat(32),
  target: anchorSelection('example', 0, 7),
  body: 'Note',
  action: 'create',
  sequence: 1,
  publicKey: 'browser-key',
});
test('management merges concurrent revision lists without overwriting newer actions', () => {
  const a = note(1),
    b = note(2);
  const newer = { ...a, sequence: 2, action: 'edit' as const };
  expect(mergeOwned([a, b], [newer]).map((p) => p.sequence)).toContain(2);
  expect(mergeOwned([a, b], [newer])).toHaveLength(2);
  expect(mergeOwned([newer, b], [a]).find((p) => p.id === a.id)?.sequence).toBe(
    2,
  );
});
test('management backup restores keys and all owned revision metadata', () => {
  const notes = [note(1), note(2)];
  const saved = exportManagement(
    {
      privateKey: { kty: 'OKP', crv: 'Ed25519', d: 'fixture', x: 'fixture' },
      publicKey: 'browser-key',
    },
    notes,
  );
  const restored = importManagement(saved);
  expect(restored.notes).toHaveLength(2);
  expect(restored.keys.publicKey).toBe('browser-key');
});

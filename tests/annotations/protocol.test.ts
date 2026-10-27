import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { annotationSchema } from '../../src/portfolio/annotations/protocol';
import {
  anchorSelection,
  resolveSelection,
  annotationBytes,
} from '../../src/portfolio/annotations/protocol';
import { verifyAnnotation } from '../../src/server/annotations/signature';
import { generateKeyPairSync, sign } from 'node:crypto';
test('selectors bind exact positions and context without guessing repeated text', () => {
  const target = anchorSelection(
    'One repeated phrase. Two repeated phrase.',
    4,
    19,
  );
  expect(
    resolveSelection('One repeated phrase. Two repeated phrase.', target),
  ).toEqual({ start: 4, end: 19 });
  expect(
    resolveSelection('Changed repeated phrase. Two repeated phrase.', target),
  ).toBeNull();
  expect(() => anchorSelection('abc', 2, 1)).toThrow();
});
test('ownership signatures bind revision, note and action', () => {
  const keys = generateKeyPairSync('ed25519');
  const publicKey = keys.publicKey
    .export({ type: 'spki', format: 'der' })
    .toString('base64');
  const payload = {
    format: 'onur-annotation-v1' as const,
    id: crypto.randomUUID(),
    logId: 'example',
    revision: 1,
    revisionHash: 'ab'.repeat(32),
    target: anchorSelection('A note', 2, 6),
    body: 'Hello',
    action: 'create' as const,
    sequence: 1,
    publicKey,
  };
  const signature = sign(
    null,
    Buffer.from(annotationBytes(payload)),
    keys.privateKey,
  ).toString('base64');
  expect(verifyAnnotation(payload, signature)).toBe(true);
  expect(verifyAnnotation({ ...payload, body: 'Changed' }, signature)).toBe(
    false,
  );
  expect(() =>
    annotationBytes({ ...payload, body: 'a'.repeat(2001) }),
  ).toThrow();
});

test('long quotations retain their complete text and signed positions', () => {
  const text = 'A paragraph with context. '.repeat(500);
  const target = anchorSelection(text, 0, text.length);
  expect(target.quote.exact).toBe(text);
  expect(resolveSelection(text, target)).toEqual({
    start: 0,
    end: text.length,
  });
  expect(() =>
    annotationBytes({
      format: 'onur-annotation-v1',
      id: crypto.randomUUID(),
      logId: 'example',
      revision: 1,
      revisionHash: 'ab'.repeat(32),
      target,
      body: 'A long passage',
      action: 'create',
      sequence: 1,
      publicKey: 'test',
    }),
  ).not.toThrow();
});

test('pasted PGP public keys are format checked and bound to the signature', () => {
  const pgpPublicKey = readFileSync(
    new URL('../../public/pgp.asc', import.meta.url),
    'utf8',
  ).trim();
  expect(
    annotationSchema.shape.pgpPublicKey.safeParse(pgpPublicKey).success,
  ).toBe(true);
  expect(
    annotationSchema.shape.pgpPublicKey.safeParse(
      pgpPublicKey.replaceAll('PUBLIC KEY BLOCK', 'PRIVATE KEY BLOCK'),
    ).success,
  ).toBe(false);
  expect(
    annotationSchema.shape.pgpPublicKey.safeParse('not a public key').success,
  ).toBe(false);
  const keys = generateKeyPairSync('ed25519');
  const payload = {
    format: 'onur-annotation-v1' as const,
    id: crypto.randomUUID(),
    logId: 'example',
    revision: 1,
    revisionHash: 'ab'.repeat(32),
    target: anchorSelection('A note', 2, 6),
    body: 'Hello',
    action: 'create' as const,
    sequence: 1,
    publicKey: keys.publicKey
      .export({ type: 'spki', format: 'der' })
      .toString('base64'),
    pgpPublicKey,
  };
  const signature = sign(
    null,
    Buffer.from(annotationBytes(payload)),
    keys.privateKey,
  ).toString('base64');
  expect(verifyAnnotation(payload, signature)).toBe(true);
  const { pgpPublicKey: removed, ...withoutPgp } = payload;
  expect(removed).toBe(pgpPublicKey);
  expect(verifyAnnotation(withoutPgp, signature)).toBe(false);
});

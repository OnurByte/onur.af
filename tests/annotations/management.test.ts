import { expect, test } from 'bun:test';
import { rejects } from 'node:assert/strict';
import { z } from 'astro/zod';
import { required } from '../../src/portfolio/required';
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

test('encrypted management backup restores a signing identity on another device', async () => {
  const { encryptManagement, decryptManagement } =
    await import('../../src/portfolio/annotations/management');
  const pair = await crypto.subtle.generateKey('Ed25519', true, [
    'sign',
    'verify',
  ]);
  const keys = {
    privateKey: await crypto.subtle.exportKey('jwk', pair.privateKey),
    publicKey: Buffer.from(
      await crypto.subtle.exportKey('spki', pair.publicKey),
    ).toString('base64'),
  };
  const owned = { ...note(2), publicKey: keys.publicKey };
  const encrypted = await encryptManagement(
    keys,
    [owned],
    'a long recovery passphrase',
  );
  expect(encrypted).not.toContain(required(keys.privateKey.d));
  expect(encrypted).not.toContain(owned.body);
  const restored = await decryptManagement(
    encrypted,
    'a long recovery passphrase',
  );
  expect(restored.keys.publicKey).toBe(keys.publicKey);
  expect(restored.notes[0]).toEqual(owned);
  await rejects(decryptManagement(encrypted, 'wrong recovery passphrase'));
  const tampered = z
    .looseObject({ ciphertext: z.string() })
    .parse(JSON.parse(encrypted));
  tampered.ciphertext =
    (tampered.ciphertext.startsWith('A') ? 'B' : 'A') +
    tampered.ciphertext.slice(1);
  await rejects(
    decryptManagement(JSON.stringify(tampered), 'a long recovery passphrase'),
  );
});

test('encrypted backup refuses mismatched keys and weak passphrases', async () => {
  const { encryptManagement } =
    await import('../../src/portfolio/annotations/management');
  const a = await crypto.subtle.generateKey('Ed25519', true, [
    'sign',
    'verify',
  ]);
  const b = await crypto.subtle.generateKey('Ed25519', true, [
    'sign',
    'verify',
  ]);
  const keys = {
    privateKey: await crypto.subtle.exportKey('jwk', a.privateKey),
    publicKey: Buffer.from(
      await crypto.subtle.exportKey('spki', b.publicKey),
    ).toString('base64'),
  };
  await rejects(encryptManagement(keys, [], 'a long recovery passphrase'));
  await rejects(encryptManagement(keys, [], 'short'));
});

test('encrypted restore rejects unsupported cost parameters before deriving a key', async () => {
  const { decryptManagement } =
    await import('../../src/portfolio/annotations/management');
  const envelope = {
    format: 'onur-annotation-encrypted-backup-v1',
    kdf: 'PBKDF2-SHA256',
    iterations: 1_000_000_000,
    cipher: 'AES-256-GCM',
    salt: 'AA==',
    iv: 'AA==',
    ciphertext: 'AA==',
  };
  await rejects(
    decryptManagement(JSON.stringify(envelope), 'a long recovery passphrase'),
  );
});

import { z } from 'astro/zod';
import {
  annotationSchema,
  annotationBytes,
  type AnnotationPayload,
} from './protocol';
export const savedKeysSchema = z.object({
  publicKey: z.string(),
  privateKey: z.object({
    kty: z.string(),
    crv: z.string(),
    d: z.string(),
    x: z.string(),
  }),
});
const backupSchema = z.strictObject({
  format: z.literal('onur-annotation-backup-v1'),
  keys: savedKeysSchema,
  notes: z.array(annotationSchema).max(10000),
});
export function mergeOwned(
  current: readonly AnnotationPayload[],
  incoming: readonly AnnotationPayload[],
): AnnotationPayload[] {
  const entries = new Map(current.map((p) => [p.id, p]));
  for (const p of incoming) {
    annotationSchema.parse(p);
    const old = entries.get(p.id);
    if (!old || p.sequence > old.sequence) entries.set(p.id, p);
    else if (
      p.sequence === old.sequence &&
      annotationBytes(p) !== annotationBytes(old)
    )
      throw new Error('Conflicting annotation management metadata');
  }
  return [...entries.values()].sort((a, b) => a.id.localeCompare(b.id));
}
export function exportManagement(
  keys: z.infer<typeof savedKeysSchema>,
  notes: readonly AnnotationPayload[],
): string {
  return JSON.stringify(
    {
      format: 'onur-annotation-backup-v1',
      keys: savedKeysSchema.parse(keys),
      notes: mergeOwned(
        [],
        notes.filter((p) => p.publicKey === keys.publicKey),
      ),
    },
    null,
    2,
  );
}
export function importManagement(text: string): {
  keys: z.infer<typeof savedKeysSchema>;
  notes: AnnotationPayload[];
} {
  const input: unknown = JSON.parse(text);
  const backup = backupSchema.safeParse(input);
  if (backup.success)
    return {
      keys: backup.data.keys,
      notes: backup.data.notes.filter(
        (p) => p.publicKey === backup.data.keys.publicKey,
      ),
    };
  return { keys: savedKeysSchema.parse(input), notes: [] };
}

// The plaintext v1 functions remain available for legacy local storage migration.
// Downloads and imports in the browser use only this authenticated envelope.
const maxCiphertextLength = 16_000_000;
/** Envelope JSON adds bounded parameters around the ciphertext. */
export const maxEncryptedBackupLength = maxCiphertextLength + 1000;
const encryptedBackupSchema = z.strictObject({
  format: z.literal('onur-annotation-encrypted-backup-v1'),
  kdf: z.literal('PBKDF2-SHA256'),
  iterations: z.literal(600000),
  cipher: z.literal('AES-256-GCM'),
  salt: z.string().max(64),
  iv: z.string().max(32),
  ciphertext: z.string().max(maxCiphertextLength),
});
const envelopeLabel = new TextEncoder().encode(
  'onur-annotation-encrypted-backup-v1',
);
function base64(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}
function unbase64(text: string): Uint8Array<ArrayBuffer> {
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      text,
    )
  )
    throw new Error('Invalid backup encoding');
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}
async function recoveryKey(passphrase: string, salt: Uint8Array<ArrayBuffer>) {
  if (passphrase.length < 12 || passphrase.length > 1024)
    throw new Error(
      'Use a recovery passphrase between 12 and 1024 characters.',
    );
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 600000 },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}
export async function validateManagementKeys(
  input: unknown,
): Promise<z.infer<typeof savedKeysSchema>> {
  const keys = savedKeysSchema.parse(input);
  if (keys.privateKey.kty !== 'OKP' || keys.privateKey.crv !== 'Ed25519')
    throw new Error('Expected an Ed25519 annotation identity');
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    keys.privateKey,
    'Ed25519',
    false,
    ['sign'],
  );
  const publicKey = await crypto.subtle.importKey(
    'spki',
    unbase64(keys.publicKey),
    'Ed25519',
    false,
    ['verify'],
  );
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const signature = await crypto.subtle.sign('Ed25519', privateKey, challenge);
  if (!(await crypto.subtle.verify('Ed25519', publicKey, signature, challenge)))
    throw new Error('Annotation public and private keys do not match');
  return keys;
}
export async function encryptManagement(
  keys: unknown,
  notes: readonly AnnotationPayload[],
  passphrase: string,
): Promise<string> {
  const verified = await validateManagementKeys(keys);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await recoveryKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: envelopeLabel },
    key,
    new TextEncoder().encode(exportManagement(verified, notes)),
  );
  return JSON.stringify(
    encryptedBackupSchema.parse({
      format: 'onur-annotation-encrypted-backup-v1',
      kdf: 'PBKDF2-SHA256',
      iterations: 600000,
      cipher: 'AES-256-GCM',
      salt: base64(salt),
      iv: base64(iv),
      ciphertext: base64(new Uint8Array(ciphertext)),
    }),
  );
}
export async function decryptManagement(
  text: string,
  passphrase: string,
): Promise<ReturnType<typeof importManagement>> {
  if (text.length > maxEncryptedBackupLength)
    throw new Error('Backup is too large');
  const envelope = encryptedBackupSchema.parse(JSON.parse(text));
  const salt = unbase64(envelope.salt);
  const iv = unbase64(envelope.iv);
  if (salt.length !== 16 || iv.length !== 12)
    throw new Error('Invalid backup parameters');
  const key = await recoveryKey(passphrase, salt);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, additionalData: envelopeLabel },
    key,
    unbase64(envelope.ciphertext),
  );
  const restored = importManagement(
    new TextDecoder('utf-8', { fatal: true }).decode(plaintext),
  );
  await validateManagementKeys(restored.keys);
  return restored;
}

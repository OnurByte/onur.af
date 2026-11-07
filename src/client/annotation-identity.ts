import { z } from 'astro/zod';
import {
  savedKeysSchema,
  mergeOwned,
  encryptManagement,
  decryptManagement,
  validateManagementKeys,
  maxEncryptedBackupLength,
} from '../portfolio/annotations/management';
import {
  annotationSchema,
  type AnnotationPayload,
} from '../portfolio/annotations/protocol';
import { required } from '../portfolio/required';
import { downloadBlob } from './download';

export function formText(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value : '';
}
export const encode = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)));
interface SavedKeys {
  privateKey: JsonWebKey;
  publicKey: string;
}
export async function keys(): Promise<{
  privateKey: CryptoKey;
  publicKey: string;
}> {
  const raw = localStorage.getItem('annotation-key-v1');
  if (raw) {
    const saved = await validateManagementKeys(JSON.parse(raw));
    return {
      privateKey: await crypto.subtle.importKey(
        'jwk',
        saved.privateKey,
        { name: 'Ed25519' },
        false,
        ['sign'],
      ),
      publicKey: saved.publicKey,
    };
  }
  const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
    'sign',
    'verify',
  ]);
  const saved: SavedKeys = {
    privateKey: await crypto.subtle.exportKey('jwk', pair.privateKey),
    publicKey: encode(await crypto.subtle.exportKey('spki', pair.publicKey)),
  };
  localStorage.setItem('annotation-key-v1', JSON.stringify(saved));
  return { privateKey: pair.privateKey, publicKey: saved.publicKey };
}
export function storedNotes(raw: string | null): AnnotationPayload[] {
  return z.array(annotationSchema).parse(JSON.parse(raw ?? '[]'));
}
/** Invalid local key material grants no ownership instead of breaking the viewer. */
export function currentPublicKey(): string | undefined {
  try {
    return savedKeysSchema.safeParse(
      JSON.parse(localStorage.getItem('annotation-key-v1') ?? 'null'),
    ).data?.publicKey;
  } catch {
    return undefined;
  }
}

/** Wires the identity form: export and restore an encrypted backup of the signing key and own notes. */
export function initAnnotationBackup(root: HTMLElement): void {
  const identity = root.querySelector<HTMLFormElement>(
    '[data-annotation-identity]',
  );
  identity?.addEventListener('submit', (event) => {
    event.preventDefault();
  });
  const backupStatus = root.querySelector<HTMLElement>(
    '[data-annotation-backup-status]',
  );
  let recovering = false;
  const clearRecoveryPassphrase = () => {
    const recovery =
      identity?.querySelector<HTMLInputElement>('[name="recovery"]');
    if (recovery) recovery.value = '';
  };
  const runBackupTask = (task: () => Promise<string>, failure: string) => {
    if (recovering) return;
    recovering = true;
    void task()
      .then(
        (message) => message,
        () => failure,
      )
      .then((message) => {
        if (backupStatus) backupStatus.textContent = message;
        recovering = false;
      });
  };
  root
    .querySelector('[data-annotation-backup-export]')
    ?.addEventListener('click', () => {
      runBackupTask(async () => {
        if (backupStatus)
          backupStatus.textContent = 'Preparing encrypted backup…';
        await keys();
        const saved = savedKeysSchema.parse(
          JSON.parse(localStorage.getItem('annotation-key-v1') ?? 'null'),
        );
        const notes: AnnotationPayload[] = [];
        for (let index = 0; index < localStorage.length; index++) {
          const name = localStorage.key(index);
          if (name?.startsWith('annotation-own:'))
            notes.push(...storedNotes(localStorage.getItem(name)));
        }
        const encrypted = await encryptManagement(
          saved,
          notes,
          formText(required(identity), 'recovery'),
        );
        downloadBlob(
          new Blob([encrypted], { type: 'application/json' }),
          'annotation-identity.encrypted.json',
        );
        clearRecoveryPassphrase();
        return 'Encrypted backup downloaded. Keep the file and passphrase safe.';
      }, 'Could not create the backup. Use a passphrase of at least 12 characters.');
    });
  root
    .querySelector('[data-annotation-backup-import]')
    ?.addEventListener('click', () => {
      runBackupTask(async () => {
        const file =
          identity?.querySelector<HTMLInputElement>('[name="backup"]')
            ?.files?.[0];
        if (!file || file.size > maxEncryptedBackupLength)
          throw new Error('Invalid backup file');
        if (backupStatus)
          backupStatus.textContent = 'Restoring encrypted backup…';
        const restored = await decryptManagement(
          await file.text(),
          formText(required(identity), 'recovery'),
        );
        const updates = new Map<string, string>();
        for (const note of restored.notes) {
          const name = `annotation-own:${note.logId}`;
          const current = storedNotes(
            updates.get(name) ?? localStorage.getItem(name),
          );
          updates.set(name, JSON.stringify(mergeOwned(current, [note])));
        }
        updates.set('annotation-key-v1', JSON.stringify(restored.keys));
        const before = new Map(
          [...updates.keys()].map((name) => [name, localStorage.getItem(name)]),
        );
        try {
          for (const [name, value] of updates)
            localStorage.setItem(name, value);
        } catch (error) {
          for (const [name, value] of before) {
            if (value === null) localStorage.removeItem(name);
            else localStorage.setItem(name, value);
          }
          throw error;
        }
        clearRecoveryPassphrase();
        window.dispatchEvent(new Event('annotation-owned-changed'));
        window.dispatchEvent(new Event('annotation-published-changed'));
        return 'Annotation identity restored on this device.';
      }, 'Could not restore this backup. Check the file and recovery passphrase.');
    });
}

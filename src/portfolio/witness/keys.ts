import { createHash, createPublicKey, type KeyObject } from 'node:crypto';
import { z } from 'astro/zod';
export const witnessKeyHistorySchema = z.strictObject({
  version: z.literal(1),
  scope: z.literal('Witness statistics only'),
  keys: z
    .array(
      z.strictObject({
        id: z.string().regex(/^[a-f0-9]{64}$/),
        publicKey: z.string().max(4096),
        validFrom: z.iso.datetime(),
        retiredAt: z.iso.datetime().nullable(),
      }),
    )
    .min(1)
    .max(100),
});
/** The caller chooses this trust file independently; fetching a key does not authenticate it. */
export function parseWitnessTrust(
  text: string,
): (id: string, time: string) => KeyObject {
  if (text.includes('-----BEGIN PUBLIC KEY-----')) {
    if (text.trim().startsWith('-----BEGIN PUBLIC KEY-----')) {
      const key = createPublicKey(text);
      if (key.asymmetricKeyType !== 'ed25519')
        throw new Error('Invalid witness key');
      const actual = createHash('sha256')
        .update(key.export({ type: 'spki', format: 'der' }))
        .digest('hex');
      return (id) => {
        if (id !== actual) throw new Error('Witness trust key mismatch');
        return key;
      };
    }
  }
  const history = witnessKeyHistorySchema.parse(JSON.parse(text));
  const keys = new Map<
    string,
    { key: KeyObject; from: string; to: string | null }
  >();
  for (const entry of history.keys) {
    if (
      !/^-----BEGIN PUBLIC KEY-----\r?\n/.test(entry.publicKey) ||
      entry.publicKey.includes('PRIVATE KEY')
    )
      throw new Error('Only public witness keys allowed');
    const key = createPublicKey(entry.publicKey);
    const id = createHash('sha256')
      .update(key.export({ type: 'spki', format: 'der' }))
      .digest('hex');
    if (
      key.asymmetricKeyType !== 'ed25519' ||
      id !== entry.id ||
      keys.has(id) ||
      (entry.retiredAt &&
        Date.parse(entry.retiredAt) < Date.parse(entry.validFrom))
    )
      throw new Error('Invalid witness key history');
    keys.set(id, { key, from: entry.validFrom, to: entry.retiredAt });
  }
  return (id, time) => {
    const entry = keys.get(id);
    if (
      !entry ||
      Date.parse(time) < Date.parse(entry.from) ||
      (entry.to && Date.parse(time) >= Date.parse(entry.to))
    )
      throw new Error('Witness key not authorized at batch time');
    return entry.key;
  };
}

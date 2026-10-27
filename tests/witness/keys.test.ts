import { expect, test } from 'bun:test';
import { generateKeyPairSync, createHash } from 'node:crypto';
import { parseWitnessTrust } from '../../src/portfolio/witness/keys';
test('witness key history retains old keys and rejects use outside authorization dates', () => {
  const keys = generateKeyPairSync('ed25519');
  const pem = keys.publicKey.export({ type: 'spki', format: 'pem' });
  const id = createHash('sha256')
    .update(keys.publicKey.export({ type: 'spki', format: 'der' }))
    .digest('hex');
  const resolve = parseWitnessTrust(
    JSON.stringify({
      version: 1,
      scope: 'Witness statistics only',
      keys: [
        {
          id,
          publicKey: pem,
          validFrom: '2026-10-01T00:00:00.000Z',
          retiredAt: '2026-10-28T00:00:00.000Z',
        },
      ],
    }),
  );
  expect(resolve(id, '2026-10-27T00:00:00.000Z').asymmetricKeyType).toBe(
    'ed25519',
  );
  expect(() => resolve(id, '2026-10-29T00:00:00.000Z')).toThrow();
  expect(() => resolve('ab'.repeat(32), '2026-10-27T00:00:00.000Z')).toThrow();
});

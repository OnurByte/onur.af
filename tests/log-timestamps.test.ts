import { beforeAll, describe, expect, test, spyOn } from 'bun:test';
import { generateKey, readPrivateKey, createMessage, sign } from 'openpgp';
import ots from 'opentimestamps';
import { parseLog, revisionMarkdown } from '../src/portfolio/log';
import { digest } from '../src/portfolio/log-signatures';
import {
  detachedLogRevision,
  verifyLogTimestampBitcoin,
  validateLogTimestamps,
} from '../src/portfolio/log-timestamps';
const logEntries = parseLog([
  {
    id: 'timestamp-fixture',
    slug: 'hidden-watchtower-watches',
    title: 'Fixture',
    summary: 'A timestamp fixture',
    revisions: [
      {
        version: 1,
        publishedAt: '2026-10-15T09:00:00Z',
        body: 'Original fixture bytes.',
      },
    ],
  },
]);
const key = 'timestamp-fixture-v1';
let publicKey: string;
let signatures: Record<typeof key, { sha256: string; signature: string }>;
beforeAll(async () => {
  const keys = await generateKey({
    type: 'ecc',
    curve: 'curve25519Legacy',
    userIDs: [{ name: 'Timestamp Fixture' }],
    format: 'armored',
  });
  publicKey = keys.publicKey;
  const body = revisionMarkdown(logEntries[0]!, 1);
  const signature = await sign({
    message: await createMessage({ binary: new TextEncoder().encode(body) }),
    signingKeys: await readPrivateKey({ armoredKey: keys.privateKey }),
    detached: true,
    format: 'armored',
  });
  signatures = { [key]: { sha256: digest(body), signature } };
});
function receipt(bitcoin = false) {
  const detached = detachedLogRevision(
    logEntries.find((entry) => entry.id === 'timestamp-fixture')!,
    1,
  );
  detached.timestamp.attestations.push(
    bitcoin
      ? new ots.Notary.BitcoinBlockHeaderAttestation(900000)
      : new ots.Notary.PendingAttestation(
          'https://alice.btc.calendar.opentimestamps.org',
        ),
  );
  return {
    [key]: {
      sha256: signatures[key].sha256,
      signatureSha256: digest(signatures[key].signature),
      proof: Buffer.from(detached.serializeToBytes()).toString('base64'),
    },
  };
}
describe('Log timestamp binding', () => {
  test('pending calendar receipt never means confirmed Bitcoin', async () => {
    const records = await validateLogTimestamps(
      logEntries,
      receipt(),
      signatures,
      publicKey,
    );
    expect(records[key]!.status).toBe('pending');
    expect(records[key]!.bitcoin).toBeUndefined();
    expect(records[key]!.proofBytes.length).toBeGreaterThan(32);
  });
  test('Bitcoin height metadata is unverified until checked against chain', async () => {
    const records = await validateLogTimestamps(
      logEntries,
      receipt(true),
      signatures,
      publicKey,
    );
    expect(records[key]!.status).toBe('unverified');
    expect(records[key]!.bitcoin).toBeUndefined();
  });
  test('forged Bitcoin attestation cannot confirm when verification fails', async () => {
    const records = await validateLogTimestamps(
      logEntries,
      receipt(true),
      signatures,
      publicKey,
    );
    const verifier = spyOn(ots, 'verifyTimestamp').mockRejectedValue(
      new Error('Merkle root mismatch'),
    );
    try {
      const result = await verifyLogTimestampBitcoin(records[key]!);
      expect(result.status).toBe('unverified');
      expect(result.bitcoin).toBeUndefined();
    } finally {
      verifier.mockRestore();
    }
  });
  test('rejects unsigned revision receipt', async () => {
    await expect(
      validateLogTimestamps(logEntries, receipt(), {}, publicKey),
    ).rejects.toThrow('verified revision signature');
  });
  test('rejects signature substitution and changed revision', async () => {
    const input = receipt();
    input[key].signatureSha256 = '0'.repeat(64);
    await expect(
      validateLogTimestamps(logEntries, input, signatures, publicKey),
    ).rejects.toThrow();
    const changed = structuredClone(logEntries);
    changed.find(
      (entry) => entry.id === 'timestamp-fixture',
    )!.revisions[0]!.body += '\nchanged';
    await expect(
      validateLogTimestamps(changed, receipt(), signatures, publicKey),
    ).rejects.toThrow();
  });
  test('rejects malformed proof and proof of different bytes', async () => {
    const input = receipt();
    input[key].proof = Buffer.from('invalid receipt').toString('base64');
    await expect(
      validateLogTimestamps(logEntries, input, signatures, publicKey),
    ).rejects.toThrow();
    const detached = ots.DetachedTimestampFile.fromBytes(
      new ots.Ops.OpSHA256(),
      Buffer.from('different bytes'),
    );
    detached.timestamp.attestations.push(
      new ots.Notary.PendingAttestation(
        'https://alice.btc.calendar.opentimestamps.org',
      ),
    );
    input[key].proof = Buffer.from(detached.serializeToBytes()).toString(
      'base64',
    );
    await expect(
      validateLogTimestamps(logEntries, input, signatures, publicKey),
    ).rejects.toThrow('digest mismatch');
  });
});

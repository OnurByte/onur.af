import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { verifyLogPublicationChain } from '../src/portfolio/log-publications';
import {
  publicationCheckpoint,
  compareCheckpoint,
  validateCheckpointReceipts,
} from '../src/portfolio/publication-checkpoints';

async function chain() {
  return verifyLogPublicationChain(
    JSON.parse(await readFile('src/content/log-publications.json', 'utf8')),
    await readFile('public/pgp.asc', 'utf8'),
  );
}

test('independently saved checkpoint detects rewritten or truncated publication history', async () => {
  const publications = await chain();
  const checkpoint = publicationCheckpoint(publications);
  expect(compareCheckpoint(publications, checkpoint)).toBe(true);
  expect(() =>
    compareCheckpoint(publications, { ...checkpoint, sha256: '0'.repeat(64) }),
  ).toThrow('mismatch');
  expect(() => compareCheckpoint({ editions: [] }, checkpoint)).toThrow(
    'missing',
  );
});

test('checkpoint timestamp must bind the exact signed manifest bytes', async () => {
  const publications = await chain();
  expect(() =>
    validateCheckpointReceipts(publications, {
      '1': { sha256: '0'.repeat(64), proof: 'AAAA' },
    }),
  ).toThrow();
  expect(validateCheckpointReceipts(publications, {})).toEqual({});
});

test('supplemental publication receipt binds detached signature bytes rather than manifest bytes', async () => {
  const { detachedPublication } =
    await import('../src/portfolio/publication-checkpoints');
  const { default: ots } = await import('opentimestamps');
  const publications = await chain();
  const edition = publications.editions[0]!;
  const receipt = (bytes: string) => {
    const file = detachedPublication(bytes);
    file.timestamp.attestations.push(
      new ots.Notary.PendingAttestation('https://calendar.example'),
    );
    return Buffer.from(file.serializeToBytes()).toString('base64');
  };
  const value = {
    sha256: edition.sha256,
    proof: receipt(edition.bytes),
    signatureProof: receipt(edition.signature),
  };
  expect(() =>
    validateCheckpointReceipts(publications, { '1': value }),
  ).not.toThrow();
  expect(() =>
    validateCheckpointReceipts(publications, {
      '1': { ...value, signatureProof: receipt(edition.bytes) },
    }),
  ).toThrow('signature');
});

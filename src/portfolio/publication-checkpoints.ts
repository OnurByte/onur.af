import { z } from 'astro/zod';
import ots from 'opentimestamps';
import { validateProofTimestamp } from './log-proof';
import type { VerifiedLogPublications } from './log-publications';

const checkpointSchema = z
  .object({
    format: z.literal(1),
    sequence: z.number().int().positive(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
const receiptSchema = z.record(
  z.string().regex(/^[1-9][0-9]*$/),
  z
    .object({
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      proof: z.string().min(4).max(1400000),
      signatureProof: z.string().min(4).max(1400000).optional(),
    })
    .strict(),
);

export function publicationCheckpoint(publications: VerifiedLogPublications) {
  if (!publications.latest) throw new Error('No publication checkpoint');
  return {
    format: 1 as const,
    sequence: publications.latest.manifest.sequence,
    sha256: publications.latest.sha256,
  };
}

/** The caller supplies a checkpoint previously retained outside this repository. */
export function compareCheckpoint(
  publications: VerifiedLogPublications,
  input: unknown,
): true {
  const checkpoint = checkpointSchema.parse(input);
  const edition = publications.editions.find(
    (item) => item.manifest.sequence === checkpoint.sequence,
  );
  if (!edition)
    throw new Error('Saved checkpoint edition is missing from history');
  if (edition.sha256 !== checkpoint.sha256)
    throw new Error('Saved checkpoint hash mismatch: history differs');
  return true;
}

export function detachedPublication(bytes: string) {
  return ots.DetachedTimestampFile.fromBytes(
    new ots.Ops.OpSHA256(),
    Buffer.from(bytes, 'utf8'),
  );
}

/** Offline binding only; an OTS receipt does not itself prove Bitcoin confirmation. */
export function validateCheckpointReceipts(
  publications: VerifiedLogPublications,
  input: unknown,
) {
  const store = receiptSchema.parse(input);
  for (const [sequence, receipt] of Object.entries(store)) {
    const edition = publications.editions.find(
      (item) => item.manifest.sequence === Number(sequence),
    );
    if (!edition || receipt.sha256 !== edition.sha256)
      throw new Error('Checkpoint receipt digest mismatch');
    const bytes = Buffer.from(receipt.proof, 'base64');
    if (bytes.toString('base64') !== receipt.proof)
      throw new Error('Invalid checkpoint receipt encoding');
    const detached = ots.DetachedTimestampFile.deserialize(bytes);
    if (
      detached.fileHashOp._HASHLIB_NAME() !== 'sha256' ||
      Buffer.from(detached.fileDigest()).toString('hex') !== edition.sha256 ||
      !detached.timestamp.allAttestations().size
    )
      throw new Error('Checkpoint receipt does not bind signed manifest');
    if (receipt.signatureProof)
      validateProofTimestamp(edition.signature, receipt.signatureProof);
  }
  return store;
}

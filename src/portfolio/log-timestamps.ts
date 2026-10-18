import { readJsonFile } from '../server/json-file';
import { resolve } from 'node:path';
import ots from 'opentimestamps';
import { z } from 'astro/zod';
import { logEntries, revisionMarkdown, type LogEntry } from './log';
import { digest, verifyLogSignatures } from './log-signatures';
import rawTimestamps from '../content/log-timestamps.json' with { type: 'json' };
import rawSignatures from '../content/log-signatures.json' with { type: 'json' };
import rawPublications from '../content/log-publications.json' with { type: 'json' };
import { verifyLogPublicationChain } from './log-publications';
import { revisionPublicationSequences } from './log-signatures';
import type { KeyTrust } from './key-history';

const schema = z.record(
  z.string().regex(/^[a-z0-9][a-z0-9-]*-v[1-9][0-9]*$/),
  z
    .object({
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      signatureSha256: z.string().regex(/^[a-f0-9]{64}$/),
      proof: z
        .string()
        .min(4)
        .max(1400000)
        .regex(
          /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
        ),
    })
    .strict(),
);
export type StoredLogTimestamp = z.infer<typeof schema>[string];
export type LogTimestamp = StoredLogTimestamp & {
  proofBytes: Uint8Array;
  status: 'pending' | 'unverified' | 'bitcoin-verified';
  bitcoin?: { height: number; timestamp: number };
};
/** Offline validation establishes exact content and signature binding, never Bitcoin confirmation. */
export async function validateLogTimestamps(
  entries: readonly LogEntry[],
  input: unknown,
  signatures: unknown,
  publicKey: string | KeyTrust,
  publicationSequenceByRevision: Readonly<Record<string, number>> = {},
): Promise<Record<string, LogTimestamp>> {
  const signed = await verifyLogSignatures(
    entries,
    signatures,
    publicKey,
    publicationSequenceByRevision,
  );
  const artifacts = schema.parse(input);
  const output: Record<string, LogTimestamp> = {};
  for (const [id, artifact] of Object.entries(artifacts)) {
    const signature = signed[id];
    if (
      !signature ||
      signature.sha256 !== artifact.sha256 ||
      digest(signature.signature) !== artifact.signatureSha256
    )
      throw new Error(
        `Timestamp requires matching verified revision signature: ${id}`,
      );
    const proofBytes = Buffer.from(artifact.proof, 'base64');
    if (proofBytes.toString('base64') !== artifact.proof)
      throw new Error(`Noncanonical timestamp encoding: ${id}`);
    const detached = ots.DetachedTimestampFile.deserialize(proofBytes);
    if (
      detached.fileHashOp._HASHLIB_NAME() !== 'sha256' ||
      Buffer.from(detached.fileDigest()).toString('hex') !== artifact.sha256
    )
      throw new Error(`Timestamp digest mismatch: ${id}`);
    const attestations = [...detached.timestamp.allAttestations().values()];
    if (!attestations.length)
      throw new Error(`Timestamp has no attestations: ${id}`);
    const hasBitcoin = attestations.some(
      (attestation) =>
        attestation instanceof ots.Notary.BitcoinBlockHeaderAttestation,
    );
    output[id] = {
      ...artifact,
      proofBytes,
      status:
        !hasBitcoin &&
        attestations.every(
          (attestation) => attestation instanceof ots.Notary.PendingAttestation,
        )
          ? 'pending'
          : 'unverified',
    };
  }
  return output;
}
/** Verify only existing Bitcoin attestations. Pending receipts require no network requests. */
export async function verifyLogTimestampBitcoin(
  record: LogTimestamp,
): Promise<LogTimestamp> {
  if (record.status === 'pending') return record;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const detached = ots.DetachedTimestampFile.deserialize(record.proofBytes);
    const result = await Promise.race([
      ots.verifyTimestamp(detached.timestamp, {
        ignoreBitcoinNode: true,
        timeout: 2500,
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Bitcoin verification timed out')),
          6000,
        );
      }),
    ]);
    const bitcoin = result.bitcoin;
    if (
      bitcoin &&
      Number.isSafeInteger(bitcoin.height) &&
      bitcoin.height > 0 &&
      Number.isSafeInteger(bitcoin.timestamp) &&
      bitcoin.timestamp > 0
    )
      return { ...record, status: 'bitcoin-verified', bitcoin };
  } catch {
    /* Network failures and invalid attestations never confer verified status. */
  } finally {
    clearTimeout(timer);
  }
  const { bitcoin: _bitcoin, ...unverified } = record;
  return { ...unverified, status: 'unverified' };
}
export async function readLogTimestampStore(path?: string): Promise<unknown> {
  const configured = path ?? process.env['PORTFOLIO_TIMESTAMP_STORE'];
  const source =
    configured ??
    (process.env['VERCEL']
      ? undefined
      : resolve('src/content/log-timestamps.json'));
  if (!source) return rawTimestamps;
  try {
    return await readJsonFile(source);
  } catch (error) {
    if (
      !configured &&
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    )
      return rawTimestamps;
    throw error;
  }
}

export async function getLogTimestamps(
  publicKey: string | KeyTrust,
): Promise<Record<string, LogTimestamp>> {
  const publications = await verifyLogPublicationChain(
    rawPublications,
    publicKey,
  );
  const sequences = revisionPublicationSequences(publications, logEntries);
  const records = await validateLogTimestamps(
    logEntries,
    await readLogTimestampStore(),
    rawSignatures,
    publicKey,
    sequences,
  );
  return Object.fromEntries(
    await Promise.all(
      Object.entries(records).map(async ([id, record]) => [
        id,
        await verifyLogTimestampBitcoin(record),
      ]),
    ),
  );
}
export function detachedLogRevision(entry: LogEntry, version: number) {
  return ots.DetachedTimestampFile.fromBytes(
    new ots.Ops.OpSHA256(),
    Buffer.from(revisionMarkdown(entry, version), 'utf8'),
  );
}

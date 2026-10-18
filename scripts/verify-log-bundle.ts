/** Bundled as a standalone Node.js verifier; no site, server or installed packages required. */
import { verifyLogBundle } from '../src/portfolio/log-bundle';
import { readJsonFile, writeJsonFile } from '../src/server/json-file';
import {
  decodeProofArchive,
  readProofArchiveFile,
} from '../src/portfolio/proof-archive';
import ots from 'opentimestamps';

const [path, ...args] = process.argv.slice(2);
const options = new Map<string, string>();
let bitcoin = false;
for (let i = 0; i < args.length; i++) {
  const key = args[i]!;
  if (key === '--bitcoin') {
    bitcoin = true;
    continue;
  }
  if (
    !['--fingerprint', '--checkpoint', '--save-checkpoint'].includes(key) ||
    !args[i + 1] ||
    options.has(key)
  )
    throw new Error('Unknown or duplicate verifier option');
  options.set(key, args[++i]!);
}
const fingerprint = options.get('--fingerprint');
if (!path || !fingerprint)
  throw new Error(
    'Usage: node proof-verifier.mjs archive.tar --fingerprint TRUSTED_FINGERPRINT [--checkpoint saved.json] [--save-checkpoint output.json] [--bitcoin]',
  );
const bytes = await readProofArchiveFile(path);
const checkpoint = options.get('--checkpoint');
const result = await verifyLogBundle(
  bytes,
  fingerprint,
  checkpoint ? await readJsonFile(checkpoint) : undefined,
);
const confirmations: Record<string, unknown> = {};
if (bitcoin) {
  for (const [name, proof] of decodeProofArchive(bytes)) {
    if (!name.startsWith('proofs/') || !name.endsWith('.asc.ots')) continue;
    const detached = ots.DetachedTimestampFile.deserialize(proof);
    const attestations = [...detached.timestamp.allAttestations().values()];
    if (
      !attestations.some(
        (item) => item instanceof ots.Notary.BitcoinBlockHeaderAttestation,
      )
    ) {
      confirmations[name] = { status: 'pending' };
      continue;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const verified = await Promise.race([
        ots.verifyTimestamp(detached.timestamp, {
          ignoreBitcoinNode: false,
          timeout: 5000,
        }),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Bitcoin verification timed out')),
            15000,
          );
        }),
      ]);
      confirmations[name] = verified.bitcoin
        ? { status: 'bitcoin-verified', ...verified.bitcoin }
        : { status: 'unverified' };
      if (!verified.bitcoin)
        throw new Error(
          `Bitcoin attestation could not be independently verified: ${name}`,
        );
    } finally {
      clearTimeout(timer);
    }
  }
}
const save = options.get('--save-checkpoint');
if (save) await writeJsonFile(save, result.checkpoint);
console.log(
  JSON.stringify(
    { ...result, ...(bitcoin ? { bitcoinChecks: confirmations } : {}) },
    null,
    2,
  ),
);
console.log(
  'Signature and integrity checks passed against the supplied fingerprint. Global freshness is not established.',
);

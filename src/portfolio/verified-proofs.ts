import { getLogTimestamps } from './log-timestamps';
import publicKey from '../../public/pgp.asc?raw';
import { identityProofs, verifyIdentitySignature } from './proofs';
import artifacts from '../content/log-signatures.json';
import {
  verifyLogSignatures,
  assertAllLogRevisionsSigned,
} from './log-signatures';
import { logEntries } from './log';
let logCache: ReturnType<typeof verifyLogSignatures> | undefined;
export function getLogSignatures() {
  return (logCache ??= verifyLogSignatures(
    logEntries,
    artifacts,
    publicKey,
  ).then((signatures) => {
    assertAllLogRevisionsSigned(logEntries, signatures);
    return signatures;
  }));
}

let signedIdentityCache:
  Promise<Awaited<ReturnType<typeof verifyIdentitySignature>>[]> | undefined;
export function getSignedIdentities() {
  return (signedIdentityCache ??= Promise.all(
    identityProofs.map((proof) => verifyIdentitySignature(proof, publicKey)),
  ));
}

let timestampCache:
  { expires: number; result: ReturnType<typeof getLogTimestamps> } | undefined;
export function getLogTimestampProofs() {
  if (!timestampCache || timestampCache.expires < Date.now())
    timestampCache = {
      expires: Date.now() + 300000,
      result: getLogTimestamps(publicKey),
    };
  return timestampCache.result;
}

import artifacts from '../content/log-signatures.json';
import publicationArtifacts from '../content/log-publications.json' with { type: 'json' };
import { logEntries } from './log';
import { siteKeyTrust as keyTrust } from './site-key-trust';
import {
  verifyLogSignatures,
  assertAllLogRevisionsSigned,
  revisionPublicationSequences,
} from './log-signatures';
import {
  verifyLogPublications,
  verifyLogPublicationChain,
  type VerifiedLogPublications,
} from './log-publications';

let logCache: ReturnType<typeof verifyLogSignatures> | undefined;
export function getLogSignatures() {
  return (logCache ??= keyTrust.then(async (trust) => {
    const publications = await verifyLogPublicationChain(
      publicationArtifacts,
      trust,
    );
    const sequences = revisionPublicationSequences(publications, logEntries);
    const signatures = await verifyLogSignatures(
      logEntries,
      artifacts,
      trust,
      sequences,
    );
    assertAllLogRevisionsSigned(logEntries, signatures);
    return signatures;
  }));
}

let logPublicationCache: Promise<VerifiedLogPublications> | undefined;
export function getLogPublications() {
  return (logPublicationCache ??= Promise.all([
    getLogSignatures(),
    keyTrust,
  ]).then(([signatures, trust]) =>
    verifyLogPublications(logEntries, signatures, publicationArtifacts, trust),
  ));
}

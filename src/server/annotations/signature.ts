import { createPublicKey, verify } from 'node:crypto';
import {
  annotationBytes,
  type AnnotationPayload,
} from '../../portfolio/annotations/protocol';
export function verifyAnnotation(
  payload: AnnotationPayload,
  signature: string,
): boolean {
  try {
    const key = createPublicKey({
      key: Buffer.from(payload.publicKey, 'base64'),
      type: 'spki',
      format: 'der',
    });
    return (
      key.asymmetricKeyType === 'ed25519' &&
      verify(
        null,
        Buffer.from(annotationBytes(payload)),
        key,
        Buffer.from(signature, 'base64'),
      )
    );
  } catch {
    return false;
  }
}

import { expect, test } from 'bun:test';
import { generateKey, createMessage, readPrivateKey, sign } from 'openpgp';
import ots from 'opentimestamps';
import {
  canonicalLogProof,
  proofDigest,
  verifyLogProof,
  type LogProofStatement,
} from '../src/portfolio/log-proof';

const generated = await generateKey({
  type: 'ecc',
  curve: 'curve25519Legacy',
  userIDs: [{ name: 'Proof fixture' }],
  format: 'armored',
});
const privateKey = await readPrivateKey({ armoredKey: generated.privateKey });
const fingerprint = privateKey.getFingerprint().toUpperCase();
const markdown = new TextEncoder().encode(
  '---\nid: veiled-compass-turns\nversion: 1\n---\n\nhello\n',
);
async function signature(body: Uint8Array) {
  return String(
    await sign({
      message: await createMessage({ binary: body }),
      signingKeys: privateKey,
      detached: true,
      format: 'armored',
    }),
  );
}
async function fixture() {
  const markdownSignature = await signature(markdown);
  const media = new TextEncoder().encode('original image bytes');
  const statement: LogProofStatement = {
    format: 'onur.log.proof.v2',
    id: 'veiled-compass-turns',
    version: 1,
    publicationSequence: 1,
    signer: fingerprint,
    markdown: { sha256: proofDigest(markdown), size: markdown.length },
    markdownSignature: {
      sha256: proofDigest(markdownSignature),
      size: Buffer.byteLength(markdownSignature),
    },
    media: [
      { path: '/media/a.png', sha256: proofDigest(media), size: media.length },
    ],
    externalMedia: [],
  };
  const bytes = canonicalLogProof(statement);
  return {
    artifact: {
      statement: bytes,
      signature: await signature(new TextEncoder().encode(bytes)),
    },
    markdown,
    markdownSignature,
    media,
    statement,
  };
}

test('independent proof verification binds subject, both signatures and original media', async () => {
  const f = await fixture();
  const result = await verifyLogProof(
    f.artifact,
    {
      markdown: f.markdown,
      markdownSignature: f.markdownSignature,
      media: new Map([[proofDigest(f.media), f.media]]),
    },
    generated.publicKey,
    { id: f.statement.id, version: 1 },
  );
  expect(result.fingerprint).toBe(fingerprint);
  expect(result.mediaCount).toBe(1);
  expect(result.timestamp).toBe('absent');
});
test('rejects content, media and subject substitution', async () => {
  const f = await fixture();
  const files = {
    markdown: f.markdown,
    markdownSignature: f.markdownSignature,
    media: new Map([[proofDigest(f.media), f.media]]),
  };
  await expect(
    verifyLogProof(
      f.artifact,
      { ...files, markdown: new Uint8Array([1]) },
      generated.publicKey,
    ),
  ).rejects.toThrow('Markdown');
  await expect(
    verifyLogProof(
      f.artifact,
      {
        ...files,
        media: new Map([[proofDigest(f.media), new Uint8Array([1])]]),
      },
      generated.publicKey,
    ),
  ).rejects.toThrow('media');
  await expect(
    verifyLogProof(f.artifact, files, generated.publicKey, {
      id: 'other-subject-walks',
      version: 1,
    }),
  ).rejects.toThrow('subject');
  await expect(
    verifyLogProof(
      { ...f.artifact, signature: f.markdownSignature },
      files,
      generated.publicKey,
    ),
  ).rejects.toThrow();
});
test('only the exact proof signature is the OTS preimage; pending is not confirmation', async () => {
  const f = await fixture();
  const detached = ots.DetachedTimestampFile.fromBytes(
    new ots.Ops.OpSHA256(),
    Buffer.from(f.artifact.signature),
  );
  detached.timestamp.attestations.push(
    new ots.Notary.PendingAttestation('https://calendar.example'),
  );
  const timestamp = Buffer.from(detached.serializeToBytes()).toString('base64');
  const files = {
    markdown: f.markdown,
    markdownSignature: f.markdownSignature,
    media: new Map([[proofDigest(f.media), f.media]]),
  };
  expect(
    (
      await verifyLogProof(
        { ...f.artifact, timestamp },
        files,
        generated.publicKey,
      )
    ).timestamp,
  ).toBe('pending');
  const wrong = ots.DetachedTimestampFile.fromBytes(
    new ots.Ops.OpSHA256(),
    Buffer.from(f.artifact.statement),
  );
  wrong.timestamp.attestations.push(
    new ots.Notary.PendingAttestation('https://calendar.example'),
  );
  await expect(
    verifyLogProof(
      {
        ...f.artifact,
        timestamp: Buffer.from(wrong.serializeToBytes()).toString('base64'),
      },
      files,
      generated.publicKey,
    ),
  ).rejects.toThrow('Timestamp');
});
test('canonical format rejects duplicate media, traversal, unknown fields and reordered bytes', async () => {
  const f = await fixture();
  expect(() =>
    canonicalLogProof({
      ...f.statement,
      media: [...f.statement.media, ...f.statement.media],
    }),
  ).toThrow();
  expect(() =>
    canonicalLogProof({
      ...f.statement,
      media: [{ ...f.statement.media[0]!, path: '/../secret' }],
    }),
  ).toThrow();
  expect(() =>
    canonicalLogProof({ ...f.statement, extra: 1 } as LogProofStatement),
  ).toThrow();
  await expect(
    verifyLogProof(
      { ...f.artifact, statement: JSON.stringify(f.statement) },
      {
        markdown: f.markdown,
        markdownSignature: f.markdownSignature,
        media: new Map(),
      },
      generated.publicKey,
    ),
  ).rejects.toThrow('canonical');
});

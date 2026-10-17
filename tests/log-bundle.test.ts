import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKey, readPrivateKey, createMessage, sign } from 'openpgp';
import { parseLog, revisionMarkdown } from '../src/portfolio/log';
import { canonicalLogPublication } from '../src/portfolio/log-publications';
import { canonicalLogProof, proofDigest } from '../src/portfolio/log-proof';
import { buildLogBundle, verifyLogBundle } from '../src/portfolio/log-bundle';
import {
  decodeProofArchive,
  encodeProofArchive,
} from '../src/portfolio/proof-archive';

test('portable v2 bundle verifies without a site and rejects substituted roots, dropped proofs and rollback', async () => {
  const keys = await generateKey({
    type: 'ecc',
    curve: 'curve25519Legacy',
    userIDs: [{ name: 'Offline fixture' }],
    format: 'armored',
  });
  const privateKey = await readPrivateKey({ armoredKey: keys.privateKey });
  const fingerprint = privateKey.getFingerprint().toUpperCase();
  const signature = async (body: string) =>
    String(
      await sign({
        message: await createMessage({ binary: Buffer.from(body) }),
        signingKeys: privateKey,
        detached: true,
        format: 'armored',
      }),
    );
  const entry = parseLog([
    {
      id: 'veiled-compass-turns',
      title: 'Offline',
      summary: 'Portable fixture',
      revisions: [
        {
          version: 1,
          publishedAt: '2026-10-18T00:00:00Z',
          body: 'A preserved thought.',
        },
      ],
    },
  ])[0]!;
  const markdown = revisionMarkdown(entry, 1),
    markdownSignature = await signature(markdown);
  const statement = canonicalLogProof({
    format: 'onur.log.proof.v2',
    id: entry.id,
    version: 1,
    publicationSequence: 1,
    signer: fingerprint,
    markdown: {
      sha256: proofDigest(markdown),
      size: Buffer.byteLength(markdown),
    },
    markdownSignature: {
      sha256: proofDigest(markdownSignature),
      size: Buffer.byteLength(markdownSignature),
    },
    media: [],
    externalMedia: [],
  });
  const artifact = { statement, signature: await signature(statement) };
  const manifest = canonicalLogPublication({
    format: 2,
    sequence: 1,
    previousSha256: null,
    entries: [
      {
        id: entry.id,
        version: 1,
        sha256: proofDigest(markdown),
        proofSha256: proofDigest(statement),
      },
    ],
  });
  const root = await mkdtemp(join(tmpdir(), 'offline-bundle-'));
  try {
    const bytes = await buildLogBundle({
      entry,
      root: keys.publicKey,
      history: { transitions: [] },
      proofs: { [`${entry.id}-v1`]: artifact },
      signatures: { [`${entry.id}-v1`]: { signature: markdownSignature } },
      publications: {
        editions: [{ manifest, signature: await signature(manifest) }],
      },
      checkpoints: {},
      timestamps: {},
      publicDirectory: root,
    });
    const verified = await verifyLogBundle(bytes, fingerprint);
    expect(verified.revisions[0]!.coverage).toBe('text-and-original-media');
    expect(
      (await verifyLogBundle(bytes, fingerprint, verified.checkpoint))
        .checkpointCompared,
    ).toBe(true);
    await expect(verifyLogBundle(bytes, '0'.repeat(40))).rejects.toThrow(
      'fingerprint',
    );
    await expect(
      verifyLogBundle(bytes, fingerprint, {
        ...verified.checkpoint,
        sequence: 2,
      }),
    ).rejects.toThrow('missing');
    await expect(
      verifyLogBundle(bytes, fingerprint, {
        ...verified.checkpoint,
        publisher: '0'.repeat(40),
      }),
    ).rejects.toThrow('publisher');
    const files = decodeProofArchive(bytes);
    files.delete(`proofs/${entry.id}-v1.json`);
    files.delete(`proofs/${entry.id}-v1.json.asc`);
    // Attacker can rewrite unsigned inventory; the signed publication still requires its proof.
    const index = JSON.parse(files.get('bundle.json')!.toString()) as {
      files: Record<string, string>;
    };
    delete index.files[`proofs/${entry.id}-v1.json`];
    delete index.files[`proofs/${entry.id}-v1.json.asc`];
    files.set('bundle.json', Buffer.from(JSON.stringify(index)));
    await expect(
      verifyLogBundle(encodeProofArchive(files), fingerprint),
    ).rejects.toThrow('Publication-bound proof');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

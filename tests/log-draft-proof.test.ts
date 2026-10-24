import { expect, test } from 'bun:test';
import { generateKey, createMessage, readPrivateKey, sign } from 'openpgp';
import drafts from '../src/content/log-drafts.json';
import { parseLog, revisionMarkdown } from '../src/portfolio/log';
import { digest, verifyLogSignatures } from '../src/portfolio/log-signatures';

test('Log evidence uses the real Log verifier and binds exact body and Sources bytes', async () => {
  const publication = parseLog(drafts)[0];
  if (!publication) throw new Error('Log draft missing');
  const { publicKey, privateKey } = await generateKey({
    type: 'ecc',
    curve: 'curve25519Legacy',
    userIDs: [{ name: 'Local Log proof fixture' }],
    format: 'armored',
  });
  const body = revisionMarkdown(publication, 1);
  const signature: unknown = await sign({
    message: await createMessage({ binary: new TextEncoder().encode(body) }),
    signingKeys: await readPrivateKey({ armoredKey: privateKey }),
    detached: true,
    format: 'armored',
  });
  if (typeof signature !== 'string')
    throw new Error('Expected armored signature');
  const records = {
    [`${publication.id}-v1`]: { sha256: digest(body), signature },
  };
  expect(
    Object.keys(await verifyLogSignatures([publication], records, publicKey)),
  ).toHaveLength(1);
  const first = publication.revisions[0];
  if (!first) throw new Error('Missing revision');
  const bodyFailure = await verifyLogSignatures(
    [
      {
        ...publication,
        revisions: [{ ...first, body: first.body + ' changed' }],
      },
    ],
    records,
    publicKey,
  ).then(
    () => '',
    (error: unknown) => (error instanceof Error ? error.message : 'unknown'),
  );
  expect(bodyFailure).toContain('changed since signing');
  const sourceFailure = await verifyLogSignatures(
    [
      {
        ...publication,
        revisions: [
          {
            ...first,
            sources: [{ title: 'Replaced', url: 'https://example.com' }],
          },
        ],
      },
    ],
    records,
    publicKey,
  ).then(
    () => '',
    (error: unknown) => (error instanceof Error ? error.message : 'unknown'),
  );
  expect(sourceFailure).toContain('changed since signing');
});

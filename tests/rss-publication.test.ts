import { beforeAll, expect, test } from 'bun:test';
import { createMessage, generateKey, readPrivateKey, sign } from 'openpgp';
import { rssXml } from '../src/portfolio/feeds';
import { rssDigest, rssSignatureSchema } from '../src/portfolio/rss-signatures';
import { resolveRssPublication } from '../src/portfolio/rss-publication';

const origin = 'https://example.com';
let publicKey: string;
let artifact: unknown;
beforeAll(async () => {
  const keys = await generateKey({
    type: 'ecc',
    curve: 'curve25519Legacy',
    userIDs: [{ name: 'Feed Test' }],
    format: 'armored',
  });
  publicKey = keys.publicKey;
  const xml = rssXml(origin)!;
  const signature = await sign({
    message: await createMessage({ binary: new TextEncoder().encode(xml) }),
    signingKeys: await readPrivateKey({ armoredKey: keys.privateKey }),
    detached: true,
    format: 'armored',
  });
  artifact = { version: 1, origin, sha256: rssDigest(xml), signature };
});
test('advertises a signature only after cryptographic verification', async () => {
  const result = await resolveRssPublication(
    origin,
    new URL('http://localhost:3131/rss.xml'),
    [],
    artifact,
    publicKey,
  );
  expect(result.verification.status).toBe('signed');
  expect(result.response.status).toBe(200);
  expect(await result.response.text()).toBe(rssXml(origin)!);
  expect(result.response.headers.get('Link')).toContain('/rss.xml.asc');
  expect(result.response.headers.get('Cache-Control')).toContain(
    'no-transform',
  );
});
test('content and origin changes fail closed rather than advertising stale signatures', async () => {
  for (const [currentOrigin, entries] of [
    ['https://changed.example', []],
    [
      origin,
      [
        {
          id: 'new',
          title: 'New',
          url: '/new',
          summary: 'Changed',
          publishedAt: '2026-10-15T10:00:00Z',
        },
      ],
    ],
  ] as const) {
    const result = await resolveRssPublication(
      currentOrigin,
      undefined,
      entries,
      artifact,
      publicKey,
    );
    expect(result.verification.status).toBe('invalid');
    expect(result.response.status).toBe(503);
    expect(result.response.headers.get('Link')).toBeNull();
  }
});
test('unsigned local development stays functional; arbitrary unconfigured hosts do not', async () => {
  const local = await resolveRssPublication(
    undefined,
    new URL('http://localhost:3131/rss'),
    [],
    null,
    publicKey,
  );
  expect(local.verification.status).toBe('unsigned');
  expect(local.response.status).toBe(200);
  expect(local.response.headers.get('Link')).toBeNull();
  const unavailable = await resolveRssPublication(
    undefined,
    new URL('https://unconfigured.example/rss'),
    [],
    null,
    publicKey,
  );
  expect(unavailable.verification.status).toBe('unavailable');
  expect(unavailable.response.status).toBe(503);
});

test('unsigned artifact metadata cannot relabel a valid signature to another origin', async () => {
  const relabeled = {
    ...rssSignatureSchema.parse(artifact),
    origin: 'https://wrong.example',
  };
  const result = await resolveRssPublication(
    origin,
    undefined,
    [],
    relabeled,
    publicKey,
  );
  expect(result.verification.status).toBe('invalid');
  expect(result.response.status).toBe(503);
});

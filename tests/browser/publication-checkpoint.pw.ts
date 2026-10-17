import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { createMessage, readKey, readSignature, verify } from 'openpgp';
import ots from 'opentimestamps';

test('downloaded checkpoint, manifest, signature and timestamp bind identical bytes', async ({
  request,
}) => {
  const checkpointResponse = await request.get('/proofs/checkpoint.json');
  expect(checkpointResponse.status()).toBe(200);
  const checkpoint = await checkpointResponse.json();
  const file = `/proofs/log-publication-v${checkpoint.sequence}.json`;
  const manifestResponse = await request.get(file);
  const manifest = await manifestResponse.text();
  expect(createHash('sha256').update(manifest).digest('hex')).toBe(
    checkpoint.sha256,
  );
  const key = await readKey({
    armoredKey: await (await request.get('/pgp.asc')).text(),
  });
  const signature = await readSignature({
    armoredSignature: await (await request.get(`${file}.asc`)).text(),
  });
  const verified = await verify({
    message: await createMessage({ text: manifest }),
    signature,
    verificationKeys: key,
  });
  await verified.signatures[0]!.verified;
  const receiptResponse = await request.get(`${file}.ots`);
  expect(receiptResponse.status()).toBe(200);
  const receipt = ots.DetachedTimestampFile.deserialize(
    await receiptResponse.body(),
  );
  expect(Buffer.from(receipt.fileDigest()).toString('hex')).toBe(
    checkpoint.sha256,
  );
  const documents = await (await request.get('/search-index.json')).json();
  for (const document of documents) {
    const id = document.url.split('/').at(-1);
    const image = await request.get(`/social/log-${id}.png`);
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toContain('image/png');
  }
});

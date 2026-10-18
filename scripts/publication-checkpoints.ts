import { readJsonFile, writeJsonFile } from '../src/server/json-file';
import { readFile } from 'node:fs/promises';
import ots from 'opentimestamps';
import { verifyLogPublicationChain } from '../src/portfolio/log-publications';
import { loadConfiguredKeyTrust } from '../src/portfolio/key-history';
import {
  publicationCheckpoint,
  compareCheckpoint,
  detachedPublication,
  validateCheckpointReceipts,
} from '../src/portfolio/publication-checkpoints';

const [command, argument, ...extra] = process.argv.slice(2);
if (
  extra.length ||
  !['export', 'compare', 'stamp', 'upgrade', '--check'].includes(
    command ?? '',
  ) ||
  (command !== 'compare' && argument) ||
  (command === 'compare' && !argument)
)
  throw new Error(
    'Usage: bun run checkpoints export | compare <saved-file> | stamp | upgrade | --check',
  );
const publicKey = await readFile('public/pgp.asc', 'utf8');
const trust = await loadConfiguredKeyTrust(
  publicKey,
  await readJsonFile('src/content/key-history.json'),
);
const publications = await verifyLogPublicationChain(
  await readJsonFile('src/content/log-publications.json'),
  trust,
);
if (command === 'export')
  console.log(JSON.stringify(publicationCheckpoint(publications), null, 2));
else if (command === 'compare') {
  compareCheckpoint(publications, await readJsonFile(argument!));
  console.log('Saved checkpoint matches verified publication history.');
} else {
  const path = 'src/content/publication-checkpoints.json';
  const store = validateCheckpointReceipts(
    publications,
    await readJsonFile(path),
  );
  if (command === '--check') {
    const missing = publications.editions.filter(
      (item) =>
        !store[String(item.manifest.sequence)] ||
        (item.manifest.format === 2 &&
          !store[String(item.manifest.sequence)]?.signatureProof),
    );
    if (missing.length)
      throw new Error(
        `Missing publication timestamp receipts: ${missing.map((item) => item.manifest.sequence).join(', ')}`,
      );
    console.log(
      'Publication timestamp receipts match signed manifests (offline; confirmation not implied).',
    );
  } else {
    for (const edition of publications.editions) {
      const sequence = String(edition.manifest.sequence);
      if (command === 'stamp' && store[sequence]?.signatureProof) continue;
      async function timestamp(bytes: string, existing?: string) {
        if (existing && command === 'stamp') return existing;
        const detached = existing
          ? ots.DetachedTimestampFile.deserialize(
              Buffer.from(existing, 'base64'),
            )
          : detachedPublication(bytes);
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            command === 'upgrade' && existing
              ? ots.upgrade(detached)
              : ots.stamp(detached),
            new Promise<never>((_, reject) => {
              timer = setTimeout(
                () => reject(new Error('Calendar request timed out')),
                30000,
              );
            }),
          ]);
        } finally {
          clearTimeout(timer);
        }
        return Buffer.from(detached.serializeToBytes()).toString('base64');
      }
      const prior = store[sequence];
      store[sequence] = {
        sha256: edition.sha256,
        proof: await timestamp(edition.bytes, prior?.proof),
        signatureProof: await timestamp(
          edition.signature,
          prior?.signatureProof,
        ),
      };
      validateCheckpointReceipts(publications, store);
      await writeJsonFile(path, store);
      console.log(`Stored publication ${sequence} timestamp receipt.`);
    }
  }
}

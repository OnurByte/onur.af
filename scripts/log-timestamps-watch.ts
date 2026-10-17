import { readJsonFile } from '../src/server/json-file';
import { z } from 'astro/zod';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseLog } from '../src/portfolio/log';
import { loadConfiguredKeyTrust } from '../src/portfolio/key-history';
import { verifyLogPublicationChain } from '../src/portfolio/log-publications';
import { revisionPublicationSequences } from '../src/portfolio/log-signatures';
import {
  validateLogTimestamps,
  verifyLogTimestampBitcoin,
} from '../src/portfolio/log-timestamps';
const execute = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const once = process.argv.includes('--once');
if (process.argv.slice(2).some((arg) => arg !== '--once'))
  throw new Error('Usage: bun scripts/log-timestamps-watch.ts [--once]');
let lastState = '';
let lastError = '';
let failures = 0;
async function inspect() {
  const [entries, receipts, signatures, publicKey] = await Promise.all([
    readJsonFile(new URL('../src/content/log.json', import.meta.url)),
    readJsonFile(
      new URL('../src/content/log-timestamps.json', import.meta.url),
    ),
    readJsonFile(
      new URL('../src/content/log-signatures.json', import.meta.url),
    ),
    readFile(new URL('../public/pgp.asc', import.meta.url), 'utf8'),
  ]);
  const parsedEntries = parseLog(entries);
  const trust = await loadConfiguredKeyTrust(
    publicKey,
    await readJsonFile(
      new URL('../src/content/key-history.json', import.meta.url),
    ),
  );
  const publications = await verifyLogPublicationChain(
    await readJsonFile(
      new URL('../src/content/log-publications.json', import.meta.url),
    ),
    trust,
  );
  const records = await validateLogTimestamps(
    parsedEntries,
    receipts,
    signatures,
    trust,
    revisionPublicationSequences(publications, parsedEntries),
  );
  const checked = await Promise.all(
    Object.entries(records).map(
      async ([id, record]) =>
        [id, await verifyLogTimestampBitcoin(record)] as const,
    ),
  );
  const state = checked
    .map(
      ([id, record]) =>
        `${id}: ${record.status}${record.bitcoin ? ` (Bitcoin block ${record.bitcoin.height}, ${new Date(record.bitcoin.timestamp * 1000).toISOString()})` : ''}`,
    )
    .join('\n');
  if (state !== lastState) {
    console.log(state || 'No timestamp receipts.');
    lastState = state;
  }
  return (
    checked.length > 0 &&
    checked.every(([, record]) => record.status === 'bitcoin-verified')
  );
}
for (;;) {
  try {
    // Bound each receipt separately so a slow later receipt cannot starve earlier upgrades.
    const receipts = z
      .record(z.string(), z.unknown())
      .parse(
        await readJsonFile(
          new URL('../src/content/log-timestamps.json', import.meta.url),
        ),
      );
    const errors: string[] = [];
    for (const id of Object.keys(receipts)) {
      try {
        await execute(
          process.execPath,
          ['scripts/log-timestamps.ts', 'upgrade', id],
          {
            cwd: root,
            timeout: 40000,
            killSignal: 'SIGKILL',
            maxBuffer: 1024 * 1024,
          },
        );
      } catch (error) {
        errors.push(
          `${id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    const confirmed = await inspect();
    if (errors.length && !confirmed) throw new Error(errors.join('\n'));
    if (lastError) console.log('Timestamp calendar requests recovered.');
    lastError = '';
    failures = 0;
    if (confirmed) {
      console.log(
        'All stored receipts independently verified against Bitcoin through the configured explorer.',
      );
      break;
    }
    if (once) break;
  } catch (error) {
    failures += 1;
    const message = error instanceof Error ? error.message : String(error);
    if (message !== lastError) {
      console.error(`Timestamp retry needed: ${message}`);
      lastError = message;
    }
    if (once) throw error;
  }
  await new Promise((resolve) =>
    setTimeout(resolve, Math.min(60000 * 2 ** Math.min(failures, 4), 900000)),
  );
}

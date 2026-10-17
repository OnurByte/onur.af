import { readJsonFile, writeJsonFile } from '../src/server/json-file';
import ots from 'opentimestamps';
import { readFile } from 'node:fs/promises';
import { logEntries, getLogEntryById } from '../src/portfolio/log';
import { digest, verifyLogSignatures } from '../src/portfolio/log-signatures';
import { revisionPublicationSequences } from '../src/portfolio/log-signatures';
import { verifyLogPublicationChain } from '../src/portfolio/log-publications';
import { loadConfiguredKeyTrust } from '../src/portfolio/key-history';
import {
  detachedLogRevision,
  validateLogTimestamps,
  type StoredLogTimestamp,
} from '../src/portfolio/log-timestamps';
/** Persist each successful receipt before attempting the next calendar request. */
export async function upgradeReceipts(
  keys: readonly string[],
  upgrade: (key: string) => Promise<StoredLogTimestamp>,
  persist: (key: string, receipt: StoredLogTimestamp) => Promise<void>,
): Promise<string[]> {
  const failures: string[] = [];
  for (const key of keys) {
    try {
      await persist(key, await upgrade(key));
    } catch (error) {
      failures.push(key);
      console.error(
        `Receipt upgrade failed for ${key}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return failures;
}
async function main() {
  const target = new URL('../src/content/log-timestamps.json', import.meta.url);
  const publicKey = await readFile(
    new URL('../public/pgp.asc', import.meta.url),
    'utf8',
  );
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
  const sequences = revisionPublicationSequences(publications, logEntries);
  const signatures = await readJsonFile(
    new URL('../src/content/log-signatures.json', import.meta.url),
  );
  const signed = await verifyLogSignatures(
    logEntries,
    signatures,
    trust,
    sequences,
  );
  const validated = await validateLogTimestamps(
    logEntries,
    await readJsonFile(target),
    signatures,
    trust,
    sequences,
  );
  const stored: Record<string, StoredLogTimestamp> = Object.fromEntries(
    Object.entries(validated).map(
      ([id, { sha256, signatureSha256, proof }]) => [
        id,
        { sha256, signatureSha256, proof },
      ],
    ),
  );
  const [command, id, versionArg, ...extra] = process.argv.slice(2);
  if (extra.length) throw new Error('Too many arguments');
  async function bounded<T>(promise: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Calendar request timed out')),
            25000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  if (command === '--check' && !id) {
    const missing = Object.keys(signed).filter((key) => !stored[key]);
    if (missing.length)
      throw new Error(
        `Signed revisions need timestamp receipts: ${missing.join(', ')}`,
      );
    console.log(
      `Validated ${Object.keys(stored).length} signed revision receipts (offline; no confirmation implied).`,
    );
  } else if (command === 'stamp' && id) {
    const entry = getLogEntryById(id);
    if (!entry) throw new Error('Unknown Log entry');
    const version =
      versionArg === undefined
        ? entry.revisions.at(-1)!.version
        : Number(versionArg);
    const key = `${entry.id}-v${version}`;
    const signature = signed[key];
    if (!signature) throw new Error(`Sign revision first: ${key}`);
    if (stored[key])
      throw new Error(`Receipt already exists; use upgrade: ${key}`);
    const detached = detachedLogRevision(entry, version);
    await bounded(ots.stamp(detached));
    stored[key] = {
      sha256: signature.sha256,
      signatureSha256: digest(signature.signature),
      proof: Buffer.from(detached.serializeToBytes()).toString('base64'),
    };
  } else if (command === 'upgrade' && !versionArg) {
    const keys = Object.keys(stored).filter(
      (key) => !id || key === id || key.startsWith(`${id}-v`),
    );
    if (id && !keys.length) throw new Error('No matching receipt');
    const failed = await upgradeReceipts(
      keys,
      async (key) => {
        const detached = ots.DetachedTimestampFile.deserialize(
          Buffer.from(stored[key]!.proof, 'base64'),
        );
        await bounded(ots.upgrade(detached));
        return {
          ...stored[key]!,
          proof: Buffer.from(detached.serializeToBytes()).toString('base64'),
        };
      },
      async (key, receipt) => {
        const next = { ...stored, [key]: receipt };
        await save(next);
        stored[key] = receipt;
      },
    );
    if (failed.length) process.exitCode = 1;
  } else
    throw new Error(
      'Usage: bun scripts/log-timestamps.ts stamp <id> [version] | upgrade [id] | --check',
    );
  async function save(data: Record<string, StoredLogTimestamp>) {
    await validateLogTimestamps(logEntries, data, signatures, trust, sequences);
    await writeJsonFile(target, data);
  }
  if (command === 'stamp') await save(stored);
}
if (import.meta.main) await main();

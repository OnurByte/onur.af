import ots from 'opentimestamps';
import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { logEntries, logEntryForPath } from '../src/portfolio/log';
import { digest, verifyLogSignatures } from '../src/portfolio/log-signatures';
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
  const signatures = JSON.parse(
    await readFile(
      new URL('../src/content/log-signatures.json', import.meta.url),
      'utf8',
    ),
  );
  const signed = await verifyLogSignatures(logEntries, signatures, publicKey);
  const stored: Record<string, StoredLogTimestamp> = JSON.parse(
    await readFile(target, 'utf8'),
  );
  await validateLogTimestamps(logEntries, stored, signatures, publicKey);
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
    const entry = logEntryForPath(id);
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
    const matchingId = (id && logEntryForPath(id)?.id) || id;
    const keys = Object.keys(stored).filter(
      (key) =>
        !matchingId || key === matchingId || key.startsWith(`${matchingId}-v`),
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
    await validateLogTimestamps(logEntries, data, signatures, publicKey);
    const temporary = new URL(`${target.href}.${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, {
        flag: 'wx',
      });
      await rename(temporary, target);
    } finally {
      await rm(temporary, { force: true });
    }
  }
  if (command === 'stamp') await save(stored);
}
if (import.meta.main) await main();

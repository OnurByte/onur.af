import { randomUUID } from 'node:crypto';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/** Keep decoded data unknown until the caller's domain schema validates it. */
export async function readJsonFile(path: string | URL): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

/** Replace a snapshot only after a complete, exclusively created write. */
export async function writeJsonFile(
  path: string | URL,
  value: unknown,
): Promise<void> {
  const target = path instanceof URL ? fileURLToPath(path) : path;
  const serialized = JSON.stringify(value, null, 2);
  if (serialized === undefined) throw new TypeError('Expected JSON data');
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${serialized}\n`, { flag: 'wx' });
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
}

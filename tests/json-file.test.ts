import { expect, test } from 'bun:test';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readJsonFile, writeJsonFile } from '../src/server/json-file';

test('JSON files replace complete snapshots and leave no temporary files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-json-'));
  const target = join(directory, 'store.json');
  try {
    await writeFile(target, '{"old":true}');
    await writeJsonFile(new URL(`file://${target}`), { next: [1, 'two'] });
    expect(await readJsonFile(target)).toEqual({ next: [1, 'two'] });
    expect(await readFile(target, 'utf8')).toBe(
      '{\n  "next": [\n    1,\n    "two"\n  ]\n}\n',
    );
    expect(await readdir(directory)).toEqual(['store.json']);
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    await expect(writeJsonFile(target, circular)).rejects.toThrow();
    expect(await readJsonFile(target)).toEqual({ next: [1, 'two'] });
    expect(await readdir(directory)).toEqual(['store.json']);
    await writeFile(target, 'invalid json');
    await expect(readJsonFile(target)).rejects.toThrow();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);

test('failed JSON replacement cleans its written temporary file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-json-failure-'));
  const target = join(directory, 'store.json');
  try {
    await mkdir(target);
    await expect(writeJsonFile(target, { next: true })).rejects.toThrow();
    expect(await readdir(directory)).toEqual(['store.json']);
    expect(await readdir(target)).toEqual([]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);

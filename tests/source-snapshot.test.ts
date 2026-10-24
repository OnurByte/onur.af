import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sourceDigest } from '../src/server/source-snapshot';
test('check policy, dependency patches and public proof edits invalidate evidence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'onur-evidence-inputs-'));
  try {
    for (const directory of ['src', 'public', 'patches', '.github/workflows'])
      await mkdir(join(root, directory), { recursive: true });
    await writeFile(join(root, 'src/module.ts'), 'export const value=1;');
    let previous = await sourceDigest(root);
    for (const path of [
      'eslint.config.mjs',
      'eslint-suppressions.json',
      'knip.jsonc',
      'patches/compat.patch',
      'public/pgp.asc',
      '.github/workflows/ci.yml',
    ]) {
      await writeFile(join(root, path), 'changed');
      const next = await sourceDigest(root);
      expect(next).not.toBe(previous);
      previous = next;
    }
    await writeFile(
      join(root, 'public/build-evidence.json'),
      'generated output',
    );
    expect(await sourceDigest(root)).toBe(previous);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

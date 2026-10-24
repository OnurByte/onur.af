import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Hash runtime, check policy, patches and public inputs; never generated evidence or local secrets. */
export async function sourceDigest(root = process.cwd()): Promise<string> {
  const files: string[] = [];
  const ignored = new Set([
    'public/build-evidence.json',
    'public/proof-verifier.mjs',
  ]);
  async function scan(relative: string) {
    const entries = await readdir(join(root, relative), {
      withFileTypes: true,
    }).catch((error: unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
        return [];
      throw error;
    });
    for (const entry of entries) {
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (
        entry.name === '.env' ||
        entry.name.startsWith('.env.') ||
        ignored.has(path) ||
        path === 'public/log-media' ||
        path === 'public/pagefind'
      )
        continue;
      if (entry.isSymbolicLink())
        throw new Error('Evidence input symlinks require explicit review');
      if (entry.isDirectory()) await scan(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  for (const directory of [
    'src',
    'scripts',
    'tests',
    'integrations',
    'public',
    'patches',
    '.github',
  ])
    await scan(directory);
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (
      entry.isFile() &&
      (/\.(?:ts|js|mjs|cjs|json|jsonc|lock|yml|yaml)$/.test(entry.name) ||
        [
          '.node-version',
          '.prettierignore',
          '.prettierrc',
          '.gitignore',
        ].includes(entry.name))
    )
      files.push(entry.name);
  }
  const hash = createHash('sha256');
  for (const path of files.sort())
    hash
      .update(path)
      .update('\0')
      .update(await readFile(join(root, path)))
      .update('\0');
  return hash.digest('hex');
}

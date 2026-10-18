import {
  mkdir,
  realpath,
  rename,
  rm,
  writeFile,
  lstat,
  open,
} from 'node:fs/promises';
import { constants } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { isAbsolute, join, relative, resolve } from 'node:path';
import {
  proofDigest,
  validProofMediaPath,
  type LogProofStatement,
} from './log-proof';

export function normalizeProofMediaSource(source: string): string {
  if (!source.startsWith('/')) {
    const url = new URL(source);
    if (url.protocol !== 'https:' || url.username || url.password)
      throw new Error('Unsupported remote media URL');
    return source;
  }
  const path = source.split(/[?#]/)[0]!;
  if (!validProofMediaPath(path))
    throw new Error(`Unsafe media path: ${source}`);
  return path;
}
export async function readProofMediaFile(
  rootDirectory: string,
  relativePath: string,
): Promise<Uint8Array> {
  const root = await realpath(rootDirectory);
  const parts = relativePath.split('/');
  if (
    parts.some(
      (part) => !part || part === '.' || part === '..' || part.includes('\\'),
    )
  )
    throw new Error('Unsafe media filesystem path');
  let target = root;
  for (const part of parts) {
    target = join(target, part);
    if ((await lstat(target)).isSymbolicLink())
      throw new Error('Original media symlink outside immutable path policy');
  }
  const handle = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > 512 * 1024 * 1024)
      throw new Error(
        'Original media exceeds proof size limit or is not a file',
      );
    const bytes = Buffer.alloc(stat.size + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(
        bytes,
        offset,
        bytes.length - offset,
        null,
      );
      if (!bytesRead) break;
      offset += bytesRead;
    }
    if (offset !== stat.size)
      throw new Error('Original media changed while reading');
    if ((await realpath(target)) !== target)
      throw new Error('Original media changed outside immutable path policy');
    return bytes.subarray(0, offset);
  } finally {
    await handle.close();
  }
}
export async function readOriginalMedia(
  publicDirectory: string,
  path: string,
): Promise<Uint8Array> {
  if (!validProofMediaPath(path)) throw new Error('Unsafe media path');
  const root = await realpath(publicDirectory);
  const filename = resolve(root, `.${decodeURIComponent(path)}`);
  const offset = relative(root, filename);
  if (offset.startsWith('..') || isAbsolute(offset))
    throw new Error('Original media is outside public directory');
  return readProofMediaFile(root, offset);
}
export async function freezeProofMedia(
  sources: readonly string[],
  publicDirectory: string,
) {
  const media: LogProofStatement['media'] = [];
  const externalMedia: string[] = [];
  const root = await realpath(publicDirectory);
  const vault = join(root, 'proof-media');
  await mkdir(vault, { recursive: true });
  if ((await realpath(vault)) !== vault)
    throw new Error('Proof media vault must not be a symlink');
  for (const path of [
    ...new Set(sources.map(normalizeProofMediaSource)),
  ].sort()) {
    if (!path.startsWith('/')) {
      externalMedia.push(path);
      continue;
    }
    const bytes = await readOriginalMedia(root, path);
    const sha256 = proofDigest(bytes);
    const target = join(vault, sha256);
    try {
      if (
        proofDigest(await readProofMediaFile(root, `proof-media/${sha256}`)) !==
        sha256
      )
        throw new Error('Immutable media vault digest mismatch');
    } catch (error) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ))
        throw error;
      const temporary = `${target}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporary, bytes, { flag: 'wx' });
        await rename(temporary, target);
      } finally {
        await rm(temporary, { force: true });
      }
    }
    media.push({ path, sha256, size: bytes.length });
  }
  return { media, externalMedia };
}

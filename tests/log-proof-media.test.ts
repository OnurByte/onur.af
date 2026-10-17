import { expect, test } from 'bun:test';
import {
  mkdtemp,
  mkdir,
  writeFile,
  symlink,
  readFile,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { freezeProofMedia } from '../src/portfolio/log-proof-media';

test('media vault preserves original bytes and refuses outside-root symlinks', async () => {
  const root = await mkdtemp(join(tmpdir(), 'proof-media-'));
  try {
    await mkdir(join(root, 'public', 'media'), { recursive: true });
    await writeFile(join(root, 'public', 'media', 'a.png'), 'original');
    const frozen = await freezeProofMedia(
      ['/media/a.png', 'https://example.com/a.png'],
      join(root, 'public'),
    );
    expect(frozen.media.length).toBe(1);
    expect(frozen.externalMedia).toEqual(['https://example.com/a.png']);
    await writeFile(join(root, 'public', 'media', 'a.png'), 'new');
    expect(
      await readFile(
        join(root, 'public', 'proof-media', frozen.media[0]!.sha256),
        'utf8',
      ),
    ).toBe('original');
    await writeFile(join(root, 'outside'), 'private');
    await symlink(
      join(root, 'outside'),
      join(root, 'public', 'media', 'escape.png'),
    );
    await expect(
      freezeProofMedia(['/media/escape.png'], join(root, 'public')),
    ).rejects.toThrow('outside');
    await expect(
      freezeProofMedia(['/media/%2e%2e/%2e%2e/outside'], join(root, 'public')),
    ).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

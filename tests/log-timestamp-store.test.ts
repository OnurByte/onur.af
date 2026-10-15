import { expect, test } from 'bun:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readLogTimestampStore } from '../src/portfolio/log-timestamps';
test('a running server reloads upgraded receipts and does not conceal malformed stores', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'log-receipts-'));
  const path = join(directory, 'proofs.json');
  try {
    await writeFile(path, '{"revision":"pending"}');
    expect(await readLogTimestampStore(path)).toEqual({ revision: 'pending' });
    await writeFile(path, '{"revision":"upgraded"}');
    expect(await readLogTimestampStore(path)).toEqual({ revision: 'upgraded' });
    await writeFile(path, 'broken');
    expect(readLogTimestampStore(path)).rejects.toThrow();
    expect(readLogTimestampStore(join(directory, 'missing'))).rejects.toThrow();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

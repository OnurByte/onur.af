import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { withDistributionLock } from '../src/portfolio/distribution-store';

test('concurrent senders cannot read or replace the same store concurrently', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-distribution-'));
  const path = join(directory, 'receipts.json');
  try {
    await withDistributionLock(path, async () => {
      await expect(
        withDistributionLock(path, async () => {
          throw new Error('must not run');
        }),
      ).rejects.toThrow('already running');
    });
    expect(await withDistributionLock(path, async () => 'released')).toBe(
      'released',
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

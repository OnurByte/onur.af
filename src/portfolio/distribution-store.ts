import { mkdir, rm } from 'node:fs/promises';
import { dirname } from 'node:path';

/** Hold the lock across read, delivery and incremental receipt persistence. */
export async function withDistributionLock<T>(
  path: string,
  run: () => Promise<T>,
): Promise<T> {
  await mkdir(dirname(path), { recursive: true });
  const lock = `${path}.lock`;
  try {
    await mkdir(lock);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'EEXIST'
    )
      throw new Error(
        `Distribution already running or interrupted; inspect and remove ${lock} only after confirming no sender is active`,
      );
    throw error;
  }
  try {
    return await run();
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}

import {
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const TARGETS = [
  'src/content',
  'public/proofs',
  'public/proof-media',
  'public/keys',
  'public/log-media',
];
const LOCK = '.log-publication.lock';
const JOURNAL = '.log-publication-journal.json';
const READERS = '.log-publication-readers';
type Journal = {
  id: string;
  phase: 'activating' | 'committed';
  targets: string[];
  activated: string[];
  originals: Record<string, boolean>;
};
export type PublicationTransactionHooks = {
  beforeRename?: (from: string, to: string) => void | Promise<void>;
  afterJournalWrite?: (journal: Readonly<Journal>) => void | Promise<void>;
  readerWaitMs?: number;
  readerPollMs?: number;
};

export async function assertPublicationReadable(root: string) {
  root = resolve(root);
  if (await exists(join(root, LOCK)))
    throw new Error('Log publication is in progress; retry after it completes');
  const path = join(root, JOURNAL);
  if (!(await exists(path))) return;
  const journal = await readJournal(path);
  if (journal.phase === 'activating')
    throw new Error(
      'Log publication recovery is required before reading proof stores',
    );
}

/** Hold a lease while a local reader consumes publication stores. */
export async function withPublicationRead<T>(
  root: string,
  read: () => Promise<T>,
): Promise<T> {
  root = resolve(root);
  await assertPublicationReadable(root);
  const directory = join(root, READERS);
  await mkdir(directory, { recursive: true });
  if ((await realpath(directory)) !== directory)
    throw new Error('Publication reader leases must use a local directory');
  const token = randomUUID();
  const lease = join(directory, `${process.pid}-${token}`);
  await writeFile(lease, `${process.pid}\n${token}\n`, { flag: 'wx' });
  try {
    await assertPublicationReadable(root);
    return await read();
  } finally {
    await rm(lease, { force: true });
  }
}

async function exists(path: string) {
  try {
    await lstat(path);
    return true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw e;
  }
}

/** Restore a journal left by a process that stopped during activation. */
export async function recoverPublication(root: string) {
  root = resolve(root);
  const journalPath = join(root, JOURNAL);
  if (!(await exists(journalPath))) return false;
  const journal = await readJournal(journalPath);
  if (journal.phase === 'committed') {
    await rm(join(root, `.log-publication-backup-${journal.id}`), {
      recursive: true,
      force: true,
    });
    await rm(journalPath, { force: true });
    return true;
  }
  for (const target of [...journal.activated].reverse()) {
    const live = join(root, target),
      backup = join(root, `.log-publication-backup-${journal.id}`, target);
    if (await exists(backup)) {
      await rm(live, { recursive: true, force: true });
      await mkdir(join(live, '..'), { recursive: true });
      await rename(backup, live);
    } else if (!journal.originals[target]) {
      await rm(live, { recursive: true, force: true });
    }
  }
  await rm(join(root, `.log-publication-backup-${journal.id}`), {
    recursive: true,
    force: true,
  });
  await rm(journalPath, { force: true });
  return true;
}

/** Prepare in a copied checkout, then journal and activate the proof stores. */
export async function runPublicationTransaction(
  root: string,
  prepare: (stagingRoot: string) => Promise<void>,
  hooks: PublicationTransactionHooks = {},
) {
  root = resolve(root);
  const lockPath = join(root, LOCK);
  const lockContents = `${process.pid}\n${randomUUID()}\n`;
  try {
    await writeFile(lockPath, lockContents, { flag: 'wx' });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
    const oldLock = await readFile(lockPath, 'utf8');
    const owner = Number(oldLock.trim());
    if (!Number.isSafeInteger(owner) || owner <= 0 || processAlive(owner))
      throw new Error('Another log publication transaction holds the lock');
    const stalePath = `${lockPath}.${randomUUID()}.stale`;
    await rename(lockPath, stalePath).catch(() => {
      throw new Error('Another log publication transaction holds the lock');
    });
    if ((await readFile(stalePath, 'utf8')) !== oldLock) {
      if (!(await exists(lockPath))) await rename(stalePath, lockPath);
      throw new Error('Another log publication transaction holds the lock');
    }
    try {
      await writeFile(lockPath, lockContents, { flag: 'wx' });
    } catch {
      if (!(await exists(lockPath))) await rename(stalePath, lockPath);
      throw new Error('Another log publication transaction holds the lock');
    }
    await rm(stalePath, { force: true });
  }
  const id = randomUUID(),
    stage = join(root, '..', `.log-publication-stage-${id}`),
    backupRoot = join(root, `.log-publication-backup-${id}`);
  const journalPath = join(root, JOURNAL);
  try {
    await recoverPublication(root);
    const fingerprint = await snapshot(root, TARGETS);
    const nodeModules = join(root, 'node_modules');
    const ignore = new Set([
      '.git',
      'node_modules',
      'dist',
      '.astro',
      LOCK,
      JOURNAL,
      READERS,
    ]);
    await cp(root, stage, {
      recursive: true,
      filter: (source) =>
        !ignore.has(source.slice(root.length + 1).split('/')[0]!),
    });
    if (await exists(nodeModules))
      await symlink(nodeModules, join(stage, 'node_modules'), 'dir');
    await prepare(stage);
    if (fingerprint !== (await snapshot(root, TARGETS)))
      throw new Error(
        'Live publication stores changed during staging; transaction aborted',
      );
    await waitForReaders(
      root,
      hooks.readerWaitMs ?? 30_000,
      hooks.readerPollMs ?? 25,
    );
    const journal: Journal = {
      id,
      phase: 'activating',
      targets: TARGETS,
      activated: [],
      originals: {},
    };
    await writeJournal(journalPath, journal, hooks);
    await mkdir(backupRoot, { recursive: true });
    for (const target of TARGETS) {
      const staged = join(stage, target),
        live = join(root, target),
        backup = join(backupRoot, target);
      if (!(await exists(staged))) continue;
      await mkdir(join(backup, '..'), { recursive: true });
      journal.originals[target] = await exists(live);
      journal.activated.push(target);
      await writeJournal(journalPath, journal, hooks);
      if (journal.originals[target]) await safeRename(live, backup, hooks);
      await mkdir(join(live, '..'), { recursive: true });
      await safeRename(staged, live, hooks);
    }
    journal.phase = 'committed';
    await writeJournal(journalPath, journal, hooks);
    await rm(backupRoot, { recursive: true, force: true });
    await rm(journalPath, { force: true });
  } catch (error) {
    if (await exists(journalPath)) await recoverPublication(root);
    throw error;
  } finally {
    await rm(stage, { recursive: true, force: true });
    if ((await readFile(lockPath, 'utf8').catch(() => '')) === lockContents)
      await rm(lockPath, { force: true });
  }
}

async function waitForReaders(root: string, timeoutMs: number, pollMs: number) {
  const directory = join(root, READERS);
  const deadline = Date.now() + timeoutMs;
  while (true) {
    if (await exists(directory)) {
      if ((await realpath(directory)) !== directory)
        throw new Error('Publication reader leases must use a local directory');
      for (const name of await readdir(directory)) {
        const match =
          /^([1-9][0-9]*)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.exec(
            name,
          );
        if (!match) throw new Error('Invalid publication reader lease');
        const pid = Number(match[1]);
        if (!Number.isSafeInteger(pid))
          throw new Error('Invalid publication reader lease owner');
        const leasePath = join(directory, name);
        let stat;
        let contents;
        try {
          stat = await lstat(leasePath);
          contents = await readFile(leasePath, 'utf8');
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
          throw error;
        }
        if (!stat.isFile() || contents !== `${pid}\n${match[2]}\n`)
          throw new Error('Invalid publication reader lease');
        if (!processAlive(pid))
          await rm(join(directory, name), { force: true });
      }
      if ((await readdir(directory)).length === 0) return;
    } else return;
    if (Date.now() >= deadline)
      throw new Error('Timed out waiting for publication readers to finish');
    await new Promise((resolveDelay) => setTimeout(resolveDelay, pollMs));
  }
}

async function safeRename(
  from: string,
  to: string,
  hooks: PublicationTransactionHooks,
) {
  await hooks.beforeRename?.(from, to);
  await rename(from, to);
}

async function writeJournal(
  path: string,
  journal: Journal,
  hooks: PublicationTransactionHooks,
) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(journal), { flag: 'wx' });
  await rename(temporary, path);
  await hooks.afterJournalWrite?.(structuredClone(journal));
}

async function readJournal(path: string): Promise<Journal> {
  const journal = JSON.parse(await readFile(path, 'utf8')) as Partial<Journal>;
  if (
    !journal ||
    typeof journal !== 'object' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      journal.id ?? '',
    ) ||
    !['activating', 'committed'].includes(journal.phase ?? '') ||
    !Array.isArray(journal.targets) ||
    journal.targets.length !== TARGETS.length ||
    TARGETS.some((target, i) => journal.targets![i] !== target) ||
    !Array.isArray(journal.activated) ||
    journal.activated.some((target) => !TARGETS.includes(target)) ||
    new Set(journal.activated).size !== journal.activated.length ||
    !journal.originals ||
    typeof journal.originals !== 'object' ||
    Array.isArray(journal.originals) ||
    Object.keys(journal.originals).some(
      (target) => !TARGETS.includes(target),
    ) ||
    journal.activated.some(
      (target) => typeof journal.originals![target] !== 'boolean',
    )
  )
    throw new Error('Invalid log publication recovery journal');
  return journal as Journal;
}

function processAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code !== 'ESRCH';
  }
}

async function snapshot(root: string, targets: string[]) {
  const { createHash } = await import('node:crypto');
  const hash = createHash('sha256');
  async function walk(path: string, label: string) {
    if (!(await exists(path))) {
      hash.update(frame(`missing:${label}`));
      return;
    }
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) {
      const { readlink } = await import('node:fs/promises');
      hash.update(frame(`link:${label}:`));
      hash.update(frame(await readlink(path)));
      return;
    }
    if (stat.isDirectory())
      for (const name of (await readdir(path)).sort()) {
        hash.update(frame(`name:${name}`));
        await walk(join(path, name), `${label}/${name}`);
      }
    else {
      hash.update(frame(`file:${label}:`));
      hash.update(frame(await readFile(path)));
    }
  }
  for (const target of targets) await walk(join(root, target), target);
  return hash.digest('hex');
}

function frame(value: string | Buffer) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  const size = Buffer.allocUnsafe(8);
  size.writeBigUInt64BE(BigInt(bytes.length));
  return Buffer.concat([size, bytes]);
}

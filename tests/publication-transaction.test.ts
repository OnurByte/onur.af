import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assertPublicationReadable,
  recoverPublication,
  runPublicationTransaction,
  withPublicationRead,
} from '../src/portfolio/publication-transaction';

const roots: string[] = [];
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'publication-transaction-'));
  roots.push(root);
  await mkdir(join(root, 'src/content'), { recursive: true });
  await mkdir(join(root, 'public/proofs'), { recursive: true });
  await writeFile(join(root, 'src/content/log.json'), 'original');
  await writeFile(join(root, 'public/proofs/a.json'), 'proof');
  return root;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

test('preparation failure preserves every live store', async () => {
  const root = await fixture();
  await expect(
    runPublicationTransaction(root, async (stage) => {
      await writeFile(join(stage, 'src/content/log.json'), 'staged');
      throw new Error('gate failed');
    }),
  ).rejects.toThrow('gate failed');
  expect(await readFile(join(root, 'src/content/log.json'), 'utf8')).toBe(
    'original',
  );
  expect(await readFile(join(root, 'public/proofs/a.json'), 'utf8')).toBe(
    'proof',
  );
});

test('a concurrent writer is rejected by the exclusive lock', async () => {
  const root = await fixture();
  await writeFile(join(root, '.log-publication.lock'), 'other process');
  await expect(runPublicationTransaction(root, async () => {})).rejects.toThrow(
    'holds the lock',
  );
  await expect(assertPublicationReadable(root)).rejects.toThrow('in progress');
});

test('writer activation waits for a leased reader to finish', async () => {
  const root = await fixture();
  let releaseReader!: () => void;
  let readerStarted!: () => void;
  let preparationFinished!: () => void;
  const readerGate = new Promise<void>((resolve) => (releaseReader = resolve));
  const started = new Promise<void>((resolve) => (readerStarted = resolve));
  const prepared = new Promise<void>(
    (resolve) => (preparationFinished = resolve),
  );
  const reader = withPublicationRead(root, async () => {
    readerStarted();
    await readerGate;
    expect(await readFile(join(root, 'src/content/log.json'), 'utf8')).toBe(
      'original',
    );
  });
  await started;
  const writer = runPublicationTransaction(root, async (stage) => {
    await writeFile(join(stage, 'src/content/log.json'), 'activated');
    preparationFinished();
  });
  await prepared;
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(await readFile(join(root, 'src/content/log.json'), 'utf8')).toBe(
    'original',
  );
  await expect(assertPublicationReadable(root)).rejects.toThrow('in progress');
  releaseReader();
  await reader;
  await writer;
  expect(await readFile(join(root, 'src/content/log.json'), 'utf8')).toBe(
    'activated',
  );
});

test('writer aborts before activation when a reader lease exceeds the wait bound', async () => {
  const root = await fixture();
  let releaseReader!: () => void;
  const gate = new Promise<void>((resolve) => (releaseReader = resolve));
  const reader = withPublicationRead(root, () => gate);
  await new Promise((resolve) => setTimeout(resolve, 5));
  await expect(
    runPublicationTransaction(
      root,
      async (stage) => {
        await writeFile(join(stage, 'src/content/log.json'), 'staged');
      },
      { readerWaitMs: 10, readerPollMs: 1 },
    ),
  ).rejects.toThrow('Timed out waiting');
  expect(await readFile(join(root, 'src/content/log.json'), 'utf8')).toBe(
    'original',
  );
  releaseReader();
  await reader;
});

test('live changes during staging abort without replacing the writer change', async () => {
  const root = await fixture();
  await expect(
    runPublicationTransaction(root, async (stage) => {
      await writeFile(join(stage, 'src/content/log.json'), 'generated');
      await writeFile(join(root, 'src/content/log.json'), 'concurrent change');
    }),
  ).rejects.toThrow('changed during staging');
  expect(await readFile(join(root, 'src/content/log.json'), 'utf8')).toBe(
    'concurrent change',
  );
});

test('recovery rolls back an interrupted activation', async () => {
  const root = await fixture();
  const id = '00000000-0000-4000-8000-000000000001';
  await mkdir(join(root, `.log-publication-backup-${id}/src/content`), {
    recursive: true,
  });
  await writeFile(
    join(root, `.log-publication-backup-${id}/src/content/log.json`),
    'original',
  );
  await writeFile(join(root, 'src/content/log.json'), 'activated');
  await writeFile(
    join(root, '.log-publication-journal.json'),
    JSON.stringify({
      id,
      phase: 'activating',
      targets: [
        'src/content',
        'public/proofs',
        'public/proof-media',
        'public/keys',
        'public/log-media',
      ],
      activated: ['src/content'],
      originals: { 'src/content': true },
    }),
  );
  await expect(assertPublicationReadable(root)).rejects.toThrow(
    'recovery is required',
  );
  expect(await recoverPublication(root)).toBe(true);
  expect(await readFile(join(root, 'src/content/log.json'), 'utf8')).toBe(
    'original',
  );
  expect(await recoverPublication(root)).toBe(false);
});

test('a rename failure during activation rolls back earlier activated stores', async () => {
  const root = await fixture();
  let renameCount = 0;
  await expect(
    runPublicationTransaction(
      root,
      async (stage) => {
        await writeFile(join(stage, 'src/content/log.json'), 'new content');
        await writeFile(join(stage, 'public/proofs/a.json'), 'new proof');
      },
      {
        beforeRename() {
          renameCount++;
          if (renameCount === 4) throw new Error('simulated activation crash');
        },
      },
    ),
  ).rejects.toThrow('simulated activation crash');
  expect(await readFile(join(root, 'src/content/log.json'), 'utf8')).toBe(
    'original',
  );
  expect(await readFile(join(root, 'public/proofs/a.json'), 'utf8')).toBe(
    'proof',
  );
});

test('committed recovery keeps activated stores while cleaning backups', async () => {
  const root = await fixture();
  const id = '00000000-0000-4000-8000-000000000002';
  await mkdir(join(root, `.log-publication-backup-${id}/src/content`), {
    recursive: true,
  });
  await writeFile(
    join(root, `.log-publication-backup-${id}/src/content/log.json`),
    'old',
  );
  await writeFile(join(root, 'src/content/log.json'), 'activated');
  await writeFile(
    join(root, '.log-publication-journal.json'),
    JSON.stringify({
      id,
      phase: 'committed',
      targets: [
        'src/content',
        'public/proofs',
        'public/proof-media',
        'public/keys',
        'public/log-media',
      ],
      activated: ['src/content'],
      originals: { 'src/content': true },
    }),
  );
  expect(await recoverPublication(root)).toBe(true);
  expect(await readFile(join(root, 'src/content/log.json'), 'utf8')).toBe(
    'activated',
  );
});

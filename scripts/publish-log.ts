import { readJsonFile } from '../src/server/json-file';
import { z } from 'astro/zod';
import { siteOrigin } from '../src/portfolio/seo';
import { finishPublication } from '../src/portfolio/publish-workflow';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getLogEntryById } from '../src/portfolio/log';
import { runPublicationTransaction } from '../src/portfolio/publication-transaction';
import { fileURLToPath } from 'node:url';
const execute = promisify(execFile);
const [id, mode, ...extra] = process.argv.slice(2);
const stagedRun = mode === '--staged';
const entry = getLogEntryById(id);
if (!entry || extra.length || (mode && !stagedRun))
  throw new Error('Usage: bun run log:publish <slug>');
if (!stagedRun) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  await runPublicationTransaction(root, async (stage) => {
    const staged = await execute(
      'bun',
      ['scripts/publish-log.ts', id!, '--staged'],
      { cwd: stage, timeout: 1200000 },
    );
    process.stdout.write(staged.stdout);
  });
  console.log(
    `Prepared /log/${entry.id}: staged proofs, publication manifest and RSS verified. Deploy before external distribution.`,
  );
  process.exit(0);
}
if (!siteOrigin())
  throw new Error(
    'Set SITE_URL to the canonical public origin before publishing',
  );
for (const revision of entry.revisions) {
  const signed = await execute(
    'bun',
    ['scripts/proofs.ts', 'log', entry.id, String(revision.version)],
    { timeout: 120000 },
  );
  process.stdout.write(signed.stdout);
  const stored = z
    .record(z.string(), z.unknown())
    .parse(
      await readJsonFile(
        new URL('../src/content/log-timestamps.json', import.meta.url),
      ),
    );
  if (!stored[`${entry.id}-v${revision.version}`]) {
    const stamped = await execute(
      'bun',
      [
        'scripts/log-timestamps.ts',
        'stamp',
        entry.id,
        String(revision.version),
      ],
      { timeout: 45000 },
    );
    process.stdout.write(stamped.stdout);
  }
}
const proofPreparation = await execute(
  'bun',
  ['scripts/log-proofs.ts', 'prepare', entry.id],
  { timeout: 120000 },
);
process.stdout.write(proofPreparation.stdout);
await finishPublication(async (args) => {
  const result = await execute('bun', args, {
    cwd: process.cwd(),
    timeout: 120000,
  });
  process.stdout.write(result.stdout);
});
console.log(
  `Prepared /log/${entry.id}: revision proofs, publication manifest and RSS verified. Deploy before external distribution.`,
);

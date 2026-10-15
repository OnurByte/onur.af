import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { logEntries } from '../src/portfolio/log';
const execute = promisify(execFile);
const [id, ...extra] = process.argv.slice(2);
const entry = logEntries.find((entry) => entry.id === id);
if (!entry || extra.length)
  throw new Error('Usage: bun run log:publish <slug>');
for (const revision of entry.revisions) {
  const signed = await execute(
    'bun',
    ['scripts/proofs.ts', 'log', entry.id, String(revision.version)],
    { timeout: 120000 },
  );
  process.stdout.write(signed.stdout);
  const stored: Record<string, unknown> = JSON.parse(
    await readFile(
      new URL('../src/content/log-timestamps.json', import.meta.url),
      'utf8',
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
await execute('bun', ['scripts/log-timestamps.ts', '--check'], {
  timeout: 15000,
});
console.log(
  `Published /log/${entry.id} with separate signatures and timestamp receipts for every revision.`,
);

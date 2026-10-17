/** Mandatory local publication gates. External delivery belongs after deployment. */
export async function finishPublication(
  run: (args: string[]) => Promise<void>,
) {
  for (const args of [
    ['scripts/log-timestamps.ts', '--check'],
    ['scripts/log-publications.ts', 'append'],
    ['scripts/publication-checkpoints.ts', 'stamp'],
    ['scripts/rss-sign.ts'],
    ['scripts/log-derived.ts'],
    ['scripts/log-proofs.ts', '--check'],
    ['scripts/proofs.ts', '--check'],
    ['scripts/log-publications.ts', '--check'],
    ['scripts/rss-sign.ts', '--check'],
    ['scripts/publication-checkpoints.ts', '--check'],
  ])
    await run(args);
}

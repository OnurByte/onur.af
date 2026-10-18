import { expect, test } from 'bun:test';
import { finishPublication } from '../src/portfolio/publish-workflow';

test('a failed RSS signing gate prevents publication verification and success', async () => {
  const completed: string[] = [];
  await expect(
    finishPublication(async (args) => {
      if (args[0] === 'scripts/rss-sign.ts')
        throw new Error('Signing key unavailable');
      completed.push(args.join(' '));
    }),
  ).rejects.toThrow('Signing key unavailable');
  expect(completed).toEqual([
    'scripts/log-timestamps.ts --check',
    'scripts/log-publications.ts append',
    'scripts/publication-checkpoints.ts stamp',
  ]);
});

test('successful local publication signs RSS and verifies all proofs before returning', async () => {
  const completed: string[] = [];
  await finishPublication(async (args) => {
    completed.push(args.join(' '));
  });
  expect(completed).toEqual([
    'scripts/log-timestamps.ts --check',
    'scripts/log-publications.ts append',
    'scripts/publication-checkpoints.ts stamp',
    'scripts/rss-sign.ts',
    'scripts/log-derived.ts',
    'scripts/log-proofs.ts --check',
    'scripts/proofs.ts --check',
    'scripts/log-publications.ts --check',
    'scripts/rss-sign.ts --check',
    'scripts/publication-checkpoints.ts --check',
  ]);
});

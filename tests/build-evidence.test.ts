import { expect, test } from 'bun:test';
import {
  evidenceSchema,
  architectureFor,
} from '../src/portfolio/build-evidence';
const base = {
  version: 1,
  revision: 'a'.repeat(40),
  dirty: true,
  sourceDigest: 'b'.repeat(64),
  generatedAt: '2026-10-21T12:00:00Z',
  checks: [],
  architecture: {},
};
test('evidence never accepts a passed check with a failing exit code or private paths', () => {
  expect(
    evidenceSchema.safeParse({
      ...base,
      checks: [
        {
          command: 'bun run verify',
          status: 'passed',
          exitCode: 1,
          startedAt: base.generatedAt,
          finishedAt: base.generatedAt,
        },
      ],
    }).success,
  ).toBe(false);
  expect(
    evidenceSchema.safeParse({
      ...base,
      architecture: {
        portfolio: {
          nodes: [{ path: '../.env', dependencies: [] }],
          omitted: 0,
        },
      },
    }).success,
  ).toBe(false);
  expect(evidenceSchema.parse(base).dirty).toBe(true);
});
test('architecture is deterministic, bounded and only includes repository sources', () => {
  const modules = [
    {
      source: 'src/a.ts',
      dependencies: [{ resolved: 'node:fs' }, { resolved: 'src/b.ts' }],
    },
    { source: 'src/b.ts', dependencies: [] },
  ];
  expect(architectureFor(modules, ['src/a.ts'])).toEqual(
    architectureFor([...modules].reverse(), ['src/a.ts']),
  );
  expect(architectureFor(modules, ['src/a.ts']).nodes).toEqual([
    { path: 'src/a.ts', dependencies: ['src/b.ts'] },
    { path: 'src/b.ts', dependencies: [] },
  ]);
  expect(architectureFor(modules, ['src/a.ts'], 1).omitted).toBe(1);
});

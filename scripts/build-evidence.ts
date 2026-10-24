import { sourceDigest } from '../src/server/source-snapshot';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { z } from 'astro/zod';
import {
  evidenceSchema,
  architectureFor,
  type BuildEvidence,
} from '../src/portfolio/build-evidence';
const decoder = new TextDecoder();
function command(args: string[]) {
  const result = Bun.spawnSync(args, { stdout: 'pipe', stderr: 'pipe' });
  if (result.exitCode !== 0)
    throw new Error(`Evidence command failed: ${args[0] ?? 'unknown'}`);
  return decoder.decode(result.stdout).trim();
}
async function snapshot() {
  let revision: string;
  let dirty: boolean | null;
  try {
    revision = command(['git', 'rev-parse', 'HEAD']);
    dirty = Boolean(command(['git', 'status', '--porcelain']));
  } catch {
    revision = z
      .string()
      .regex(/^[a-f0-9]{40}$/)
      .parse(process.env['VERCEL_GIT_COMMIT_SHA'] ?? process.env['GITHUB_SHA']);
    dirty = null;
  }
  return { revision, dirty, sourceDigest: await sourceDigest() };
}
const initial = await snapshot();
const mode = process.argv[2] ?? 'generate';
const allowed = [
  'verify',
  'lint',
  'type-coverage:check',
  'architecture:check',
  'check',
  'build',
  'deadcode:check',
  'format:check',
  'test',
  'test:smoke',
] as const;
const task = z.enum(allowed).optional().parse(process.argv[3]);
let exitCode = 0;
const receiptPath = '.local/build-receipt.json';
let previous: BuildEvidence | undefined;
try {
  previous = evidenceSchema.parse(
    JSON.parse(await readFile(receiptPath, 'utf8')),
  );
} catch {
  /* No valid previous observation. */
}
let checks =
  previous?.sourceDigest === initial.sourceDigest &&
  previous.revision === initial.revision &&
  previous.dirty === initial.dirty
    ? previous.checks
    : [];
if (mode === 'record') {
  if (!task)
    throw new Error('Usage: bun scripts/build-evidence.ts record <check-name>');
  const args = task === 'test' ? ['bun', 'test'] : ['bun', 'run', task];
  const startedAt = new Date().toISOString();
  exitCode = await Bun.spawn(args, { stdout: 'inherit', stderr: 'inherit' })
    .exited;
  const final = await snapshot();
  if (final.sourceDigest !== initial.sourceDigest)
    throw new Error('Source changed during check; receipt refused');
  const check = {
    command: task === 'test' ? 'bun test' : `bun run ${task}`,
    status: exitCode === 0 ? 'passed' : 'failed',
    exitCode,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
  checks = [
    ...checks.filter((item) => item.command !== check.command),
    evidenceSchema.shape.checks.element.parse(check),
  ];
} else if (mode !== 'generate')
  throw new Error(
    'Usage: bun scripts/build-evidence.ts [generate|record <check-name>]',
  );
const rawGraph: unknown = JSON.parse(
  command([
    'node_modules/.bin/depcruise',
    'src',
    '--config',
    '.dependency-cruiser.cjs',
    '--output-type',
    'json',
  ]),
);
const graph = z.object({ modules: z.array(z.unknown()) }).parse(rawGraph);
const evidence = evidenceSchema.parse({
  version: 1,
  ...initial,
  generatedAt: new Date().toISOString(),
  checks,
  architecture: {
    portfolio: architectureFor(graph.modules, [
      'src/pages/index.astro',
      'src/portfolio/log.ts',
    ]),
  },
});
await mkdir('.local', { recursive: true });
await writeFile(receiptPath, JSON.stringify(evidence, null, 2) + '\n');
await writeFile('public/build-evidence.json', JSON.stringify(evidence));
try {
  await copyFile(
    'public/build-evidence.json',
    'dist/client/build-evidence.json',
  );
} catch {
  /* No previous build. */
}
console.log(
  `Build evidence: ${evidence.revision.slice(0, 12)}, dirty=${String(evidence.dirty)}, ${String(checks.length)} observed checks.`,
);
process.exitCode = exitCode;

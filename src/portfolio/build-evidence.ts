import { z } from 'astro/zod';
const pathSchema = z
  .string()
  .regex(
    /^(src|scripts|tests|integrations)\/(?!.*(?:^|\/)\.{1,2}(?:\/|$))[A-Za-z0-9_./[\]-]+\.(ts|astro|json|css)$/,
  );
const nodeSchema = z
  .object({ path: pathSchema, dependencies: z.array(pathSchema) })
  .strict();
const graphSchema = z
  .object({
    nodes: z.array(nodeSchema).max(24),
    omitted: z.number().int().nonnegative(),
  })
  .strict();
const checkSchema = z
  .object({
    command: z.enum([
      'bun run verify',
      'bun run lint',
      'bun run type-coverage:check',
      'bun run architecture:check',
      'bun run check',
      'bun run build',
      'bun run deadcode:check',
      'bun run format:check',
      'bun test',
      'bun run test:smoke',
    ]),
    status: z.enum(['passed', 'failed']),
    exitCode: z.number().int().nonnegative(),
    startedAt: z.iso.datetime(),
    finishedAt: z.iso.datetime(),
  })
  .strict()
  .refine(
    (value) =>
      (value.exitCode === 0) === (value.status === 'passed') &&
      Date.parse(value.finishedAt) >= Date.parse(value.startedAt),
    'Check status must match exit code and time order',
  );
export const evidenceSchema = z
  .object({
    version: z.literal(1),
    revision: z.string().regex(/^[a-f0-9]{40}$/),
    dirty: z.boolean().nullable(),
    sourceDigest: z.string().regex(/^[a-f0-9]{64}$/),
    generatedAt: z.iso.datetime(),
    checks: z.array(checkSchema),
    architecture: z.record(z.string().regex(/^[a-z][a-z0-9-]*$/), graphSchema),
  })
  .strict();
export type BuildEvidence = z.infer<typeof evidenceSchema>;
const moduleSchema = z.object({
  source: z.string(),
  dependencies: z.array(z.object({ resolved: z.string() })),
});
export function architectureFor(
  value: unknown,
  roots: readonly string[],
  limit = 24,
): z.infer<typeof graphSchema> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 24)
    throw new Error('Invalid architecture limit');
  const modules = z.array(moduleSchema).parse(value);
  const map = new Map(
    modules
      .filter((item) => pathSchema.safeParse(item.source).success)
      .map((item) => [item.source, item]),
  );
  const pending = [...roots].sort();
  const visited = new Set<string>();
  for (const path of pending) {
    if (!path || visited.has(path)) continue;
    const module = map.get(path);
    if (!module) continue;
    visited.add(path);
    pending.push(
      ...module.dependencies
        .map((item) => item.resolved)
        .filter((dependency) => map.has(dependency))
        .sort(),
    );
  }
  const paths = [...visited].sort().slice(0, limit);
  const included = new Set(paths);
  return {
    nodes: paths.map((path) => ({
      path,
      dependencies: [
        ...new Set(
          map
            .get(path)
            ?.dependencies.map((item) => item.resolved)
            .filter((dependency) => included.has(dependency)),
        ),
      ].sort(),
    })),
    omitted: Math.max(0, visited.size - paths.length),
  };
}

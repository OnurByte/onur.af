import { expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const modulePath = resolve('src/portfolio/verified-proofs.ts');
const artifactsPath = resolve('src/content/log-proofs.json');

// Each child gets real imported proof data and an isolated publication root.
// No module mocks or locks can leak into other tests or the checkout.
async function runIsolated(body: string) {
  const root = await mkdtemp(join(tmpdir(), 'verified-proofs-'));
  try {
    const script = join(root, 'scenario.ts');
    await writeFile(
      script,
      `import { strict as assert } from 'node:assert';
import { writeFile, rm } from 'node:fs/promises';
import { getLogProofs } from ${JSON.stringify(modulePath)};
import artifacts from ${JSON.stringify(artifactsPath)} with { type: 'json' };
${body}`,
    );
    const child = Bun.spawn([process.execPath, script], {
      cwd: root,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [exitCode, stderr] = await Promise.all([
      child.exited,
      new Response(child.stderr).text(),
    ]);
    expect(stderr).toBe('');
    expect(exitCode).toBe(0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('concurrent and warm proof reads reuse the validated immutable store', async () => {
  await runIsolated(`
const [first, concurrent] = await Promise.all([getLogProofs(), getLogProofs()]);
assert.ok(Object.keys(first).length > 0);
assert.strictEqual(concurrent, first);
assert.strictEqual(await getLogProofs(), first);
`);
});

test('warm proof reads still reject active publication and recovery journals', async () => {
  await runIsolated(`
const first = await getLogProofs();
await writeFile('.log-publication.lock', 'test');
await assert.rejects(getLogProofs(), /publication is in progress/);
await rm('.log-publication.lock');
await writeFile('.log-publication-journal.json', JSON.stringify({
  id: '11111111-1111-1111-1111-111111111111', phase: 'activating',
  targets: ['src/content', 'public/proofs', 'public/proof-media', 'public/keys', 'public/log-media'],
  activated: [], originals: {},
}));
await assert.rejects(getLogProofs(), /recovery is required/);
await rm('.log-publication-journal.json');
assert.strictEqual(await getLogProofs(), first);
`);
});

test('failed proof verification is retried instead of cached', async () => {
  await runIsolated(`
const artifact = Object.values(artifacts)[0];
assert.ok(artifact);
const signature = artifact.signature;
artifact.signature = '-----BEGIN PGP SIGNATURE-----\\ninvalid\\n-----END PGP SIGNATURE-----';
await assert.rejects(getLogProofs());
artifact.signature = signature;
const recovered = await getLogProofs();
assert.ok(Object.keys(recovered).length > 0);
assert.strictEqual(await getLogProofs(), recovered);
`);
});

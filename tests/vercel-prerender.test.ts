import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Run after VERCEL=1 SITE_URL=https://portfolio.example bunx astro build.
// This validates local build output, without deploying or contacting Vercel.
const vercelBuild = test.skipIf(process.env['TEST_VERCEL_BUILD'] !== '1');
for (const path of [
  'log',
  'log/cryptic-watchtower-watches',
  'log/tag/development',
  'pgp/x',
]) {
  vercelBuild(
    `Vercel prerenders ${path} as content instead of a self-redirect`,
    async () => {
      const html = await readFile(
        join('.vercel/output/static', path, 'index.html'),
        'utf8',
      );
      expect(html).toContain('<h1');
      expect(html).not.toContain('http-equiv="refresh"');
      expect(html).not.toContain('Redirecting from');
    },
  );
}

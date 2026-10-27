import { expect, test } from 'bun:test';
import staticContent from '../integrations/static-content';
import type { AstroIntegrationLogger, RouteOptions } from 'astro';

async function routePolicy(
  immutableDeployment: boolean,
  canonicalOrigin?: string,
  dynamicLogs = false,
) {
  const integration = staticContent({
    immutableDeployment,
    canonicalOrigin,
    dynamicLogs,
  });
  const hook = integration.hooks['astro:route:setup']!;
  const routes = [
    'src/pages/log.astro',
    'src/pages/log/[id].astro',
    'src/pages/log/tag/[tag].astro',
    'src/pages/pgp/[proof].astro',
    'src/pages/search-index.json.ts',
    'src/pages/index.astro',
    'src/pages/pgp.astro',
    'src/pages/log/[id]/verified.astro',
    'src/pages/spotify.json.ts',
    'src/pages/contribute/index.astro',
    'src/pages/contribute/[id].astro',
    'src/pages/social/[page].png.ts',
  ].map((component): RouteOptions => ({ component }));
  for (const route of routes)
    await hook({ route, logger: {} as AstroIntegrationLogger });
  return routes
    .filter(({ prerender }) => prerender)
    .map(({ component }) => component);
}

test('immutable deployments prerender only selected content routes with a fixed canonical origin', async () => {
  expect(await routePolicy(true, 'https://portfolio.example')).toEqual([
    'src/pages/log.astro',
    'src/pages/log/[id].astro',
    'src/pages/log/tag/[tag].astro',
    'src/pages/pgp/[proof].astro',
    'src/pages/search-index.json.ts',
  ]);
});

test('local servers and deployments without a canonical origin retain request rendering', async () => {
  expect(await routePolicy(false, 'https://portfolio.example')).toEqual([]);
  expect(await routePolicy(true)).toEqual([]);
});

test('interactive Log modules retain request rendering on immutable deployments', async () => {
  expect(
    await routePolicy(true, 'https://portfolio.example', true),
  ).not.toContain('src/pages/log/[id].astro');
});

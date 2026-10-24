import { z } from 'astro/zod';
export const vitalSchema = z
  .object({
    name: z.enum(['LCP', 'INP', 'TTFB']),
    value: z.number().nonnegative().max(600000),
    page: z.enum(['home', 'log', 'pgp', 'rss']),
  })
  .strict();
export function vitalPage(
  path: string,
): z.infer<typeof vitalSchema>['page'] | undefined {
  if (path === '/') return 'home';
  if (path === '/log' || path.startsWith('/log/')) return 'log';
  if (path === '/pgp') return 'pgp';
  if (path === '/rss') return 'rss';
  return undefined;
}

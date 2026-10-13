import { z } from 'astro/zod';

export const publicPageSchema = z.object({
  id: z.enum(['/', '/donate', '/rss', '/pgp', '/search']),
  key: z.enum(['home', 'donate', 'rss', 'pgp', 'search']),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).max(159),
});

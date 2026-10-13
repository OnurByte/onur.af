import { z } from 'astro/zod';

export const publicPageSchema = z
  .object({
    id: z.enum(['/', '/donate', '/rss', '/pgp']),
    key: z.enum(['home', 'donate', 'rss', 'pgp']),
    title: z.string().trim().min(1),
    description: z.string().trim().max(159),
  })
  .refine((page) => page.id === '/' || page.description.length > 0, {
    message: 'Utility pages require a description',
    path: ['description'],
  });

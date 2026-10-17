import { z } from 'astro/zod';

export const publicPageSchema = z
  .object({
    id: z.enum(['/', '/contribute', '/rss', '/pgp', '/log']),
    key: z.enum(['home', 'contribute', 'rss', 'pgp', 'log']),
    title: z.string().trim().min(1),
    description: z.string().trim().max(159),
  })
  .refine((page) => page.id === '/' || page.description.length > 0, {
    message: 'Utility pages require a description',
    path: ['description'],
  });

const feedText = (maximum: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maximum)
    .refine(
      (value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value),
      'RSS text cannot contain XML control characters',
    );
export const rssEntrySchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9][a-z0-9-]*$/)
      .max(120),
    title: feedText(200),
    summary: feedText(4000),
    publishedAt: z.iso.datetime({ offset: true }),
    url: z
      .string()
      .max(2048)
      .refine((value) => {
        if (/[\u0000-\u0020\u007f\\]/.test(value)) return false;
        try {
          if (value.startsWith('/') && !value.startsWith('//')) {
            const url = new URL(value, 'https://rss.invalid');
            return (
              url.origin === 'https://rss.invalid' &&
              `${url.pathname}${url.hash}` === value
            );
          }
          const url = new URL(value);
          return url.protocol === 'https:' && !url.username && !url.password;
        } catch {
          return false;
        }
      }, 'Use a local absolute path or an HTTPS URL without credentials'),
  })
  .strict();

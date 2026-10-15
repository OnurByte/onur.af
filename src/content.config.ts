import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { publicPageSchema, rssEntrySchema } from './content/schema';

export const collections = {
  rssEntries: defineCollection({
    loader: file('src/content/rss-entries.json'),
    schema: rssEntrySchema,
  }),
  publicPages: defineCollection({
    loader: file('src/content/public-pages.json'),
    schema: publicPageSchema,
  }),
};

import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { publicPageSchema } from './content/schema';

export const collections = {
  publicPages: defineCollection({
    loader: file('src/content/public-pages.json'),
    schema: publicPageSchema,
  }),
};

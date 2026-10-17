import { resolve } from 'node:path';
import {
  createFileEmbedCache,
  createVercelBlobEmbedCache,
} from '../portfolio/embed-cache';
import { createHomeEmbedSources } from '../portfolio/home-embed-adapters';

import { createSpotifySource } from '../portfolio/spotify-source';

const cache = createFileEmbedCache(
  process.env['PORTFOLIO_EMBED_CACHE_DIR'] ||
    (process.env['VERCEL']
      ? '/tmp/onur-portfolio-embeds'
      : resolve('data', 'embeds')),
);
const spotifyCache = process.env['VERCEL']
  ? createVercelBlobEmbedCache()
  : cache;
export const spotifySource = createSpotifySource(undefined, undefined, {
  cache: spotifyCache,
});

// Order controls placement. Removing a source disables its home section.
export const homeEmbedSources = [
  ...createHomeEmbedSources(undefined, undefined, { cache }),
  spotifySource,
];

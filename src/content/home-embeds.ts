import { resolve } from 'node:path';
import {
  createFileEmbedCache,
  createVercelBlobEmbedCache,
} from '../portfolio/embed-cache';
import { createHomeEmbedSources } from '../portfolio/home-embed-adapters';

import { createSpotifySource } from '../portfolio/spotify-source';

const cache = process.env['VERCEL']
  ? createVercelBlobEmbedCache()
  : createFileEmbedCache(
      process.env['PORTFOLIO_EMBED_CACHE_DIR'] || resolve('data', 'embeds'),
    );
export const spotifySource = createSpotifySource(undefined, undefined, {
  cache,
});

// Order controls placement. Removing a source disables its home section.
export const homeEmbedSources = [
  ...createHomeEmbedSources(undefined, undefined, { cache }),
  spotifySource,
];

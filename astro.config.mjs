import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import { loadEnv } from 'vite';
import { validSiteUrl } from './src/portfolio/seo.ts';

const site = validSiteUrl(
  process.env.SITE_URL ??
    loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '').SITE_URL,
);

export default defineConfig({
  site,
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  security: {
    allowedDomains: [
      { hostname: '127.0.0.1', protocol: 'http' },
      { hostname: 'localhost', protocol: 'http' },
    ],
  },
});

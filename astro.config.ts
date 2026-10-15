import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';
import { loadEnv } from 'vite';
import stylex from '@stylexjs/unplugin';
import { validSiteUrl } from './src/portfolio/seo';

const site = validSiteUrl(
  process.env.SITE_URL ??
    loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '').SITE_URL,
);

export default defineConfig({
  vite: {
    ssr: { external: ['opentimestamps'] },
    plugins: [stylex.vite({ useCSSLayers: false, runtimeInjection: false })],
  },
  ...(site ? { site } : {}),
  output: 'server',
  adapter: process.env.VERCEL ? vercel() : node({ mode: 'standalone' }),
  security: {
    allowedDomains: [
      { hostname: '127.0.0.1', protocol: 'http' },
      { hostname: 'localhost', protocol: 'http' },
    ],
  },
});

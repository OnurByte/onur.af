import logImages from './integrations/log-images';
import staticContent from './integrations/static-content';
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';
import { loadEnv } from 'vite';
import stylex from '@stylexjs/unplugin';
import { validSiteUrl } from './src/portfolio/seo';

const site = validSiteUrl(
  process.env['SITE_URL'] ??
    loadEnv(process.env['NODE_ENV'] ?? 'production', process.cwd(), '')[
      'SITE_URL'
    ],
);

export default defineConfig({
  devToolbar: { enabled: false },
  trailingSlash: 'never',
  integrations: [
    logImages(),
    staticContent({
      immutableDeployment: Boolean(process.env['VERCEL']),
      canonicalOrigin: site,
    }),
  ],
  vite: {
    ssr: { external: ['opentimestamps'] },
    build: {
      // Inline the compact shared CSS so primary text does not wait on another request.
      assetsInlineLimit: (file, content) =>
        file.endsWith('.css') ? content.byteLength < 40 * 1024 : undefined,
    },
    plugins: [
      stylex.vite({
        useCSSLayers: false,
        runtimeInjection: false,
        lightningcssOptions: { minify: true },
      }),
    ],
  },
  ...(site ? { site } : {}),
  output: 'server',
  adapter: process.env['VERCEL'] ? vercel() : node({ mode: 'standalone' }),
  security: {
    allowedDomains: [
      { hostname: '127.0.0.1', protocol: 'http' },
      { hostname: 'localhost', protocol: 'http' },
    ],
  },
});

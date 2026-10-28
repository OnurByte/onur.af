import { expect, test } from 'bun:test';
import { z } from 'astro/zod';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fromHtml } from 'hast-util-from-html';
import { visit } from 'unist-util-visit';

function head(html: string) {
  const meta = new Map<string, string[]>();
  const canonical: string[] = [];
  const schemas: unknown[] = [];
  const components: unknown[] = [];
  visit(fromHtml(html), 'element', (node) => {
    const p = node.properties;
    if (node.tagName === 'meta') {
      const key =
        typeof p.name === 'string'
          ? p.name
          : typeof p.property === 'string'
            ? p.property
            : undefined;
      if (key && typeof p.content === 'string')
        meta.set(key, [...(meta.get(key) ?? []), p.content]);
    }
    if (
      node.tagName === 'link' &&
      Array.isArray(p.rel) &&
      p.rel.includes('canonical') &&
      typeof p.href === 'string'
    )
      canonical.push(p.href);
    if (
      node.tagName === 'script' &&
      (p.type === 'application/ld+json' || p.id === 'discord:component-embed')
    ) {
      const parsed: unknown = JSON.parse(
        node.children
          .map((child) => (child.type === 'text' ? child.value : ''))
          .join(''),
      );
      if (p.type === 'application/ld+json') schemas.push(parsed);
      else components.push(parsed);
    }
  });
  return { meta, canonical, schemas, components };
}

test.skipIf(!existsSync('dist/server/entry.mjs'))(
  'production head keeps public-origin graphs, singleton metadata and historical previews consistent',
  async () => {
    const directory = await mkdtemp(join(tmpdir(), 'onur-seo-head-'));
    const origin = 'https://portfolio.example';
    const child = Bun.spawn(['node', 'dist/server/entry.mjs'], {
      env: {
        ...process.env,
        HOST: '127.0.0.1',
        PORT: '0',
        SITE_URL: origin,
        PORTFOLIO_EMBED_CACHE_DIR: directory,
        VERCEL: '',
        VERCEL_ENV: '',
        WITNESS_ENABLED: '0',
        ANNOTATIONS_ENABLED: '0',
      },
      stdout: 'pipe',
      stderr: 'ignore',
    });
    const reader = child.stdout.getReader();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const address = await Promise.race([
        (async () => {
          let output = '';
          for (;;) {
            const { done, value } = await reader.read();
            if (done) throw new Error('SEO fixture stopped before listening');
            output += new TextDecoder().decode(value);
            const match =
              /Server listening on (http:\/\/127\.0\.0\.1:\d+)/.exec(output);
            if (match?.[1]) return match[1];
          }
        })(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            reject(new Error('SEO fixture startup timed out'));
          }, 10000);
        }),
      ]);
      const home = head(await (await fetch(address)).text());
      expect(home.canonical).toEqual([`${origin}/`]);
      for (const key of [
        'description',
        'robots',
        'og:title',
        'og:url',
        'og:image',
        'twitter:image',
      ])
        expect(home.meta.get(key)).toHaveLength(1);
      expect(home.meta.get('robots')).toEqual([
        'index, follow, max-image-preview:large',
      ]);
      expect(home.meta.get('og:image')?.[0]).toContain('/social/home.png?v=8');
      expect(home.schemas[0]).toMatchObject({
        '@graph': [
          { '@type': 'WebSite' },
          { '@type': 'Person', '@id': `${origin}/#person` },
          {
            '@type': 'ProfilePage',
            mainEntity: { '@id': `${origin}/#person` },
          },
        ],
      });
      const path = '/log/cryptic-watchtower-watches/verified';
      const old = head(await (await fetch(`${address}${path}?v=1`)).text());
      expect(old.canonical).toEqual([origin + path]);
      expect(old.meta.get('og:title')?.[0]).toContain('Build something useful');
      expect(old.meta.get('og:image')?.[0]).toContain('r=1');
      expect(old.meta.get('og:url')).toEqual([`${origin}${path}?v=1`]);
      const component = z
        .object({ component: z.object({ components: z.array(z.unknown()) }) })
        .parse(old.components[0]);
      const row = z
        .object({
          components: z.array(z.object({ label: z.string(), url: z.string() })),
        })
        .parse(component.component.components[1]);
      expect(
        row.components.find((button) => button.label === 'Open page')?.url,
      ).toBe(`${origin}${path}?v=1`);
      const unlisted = head(
        await (await fetch(`${address}/log/obscure-archive-remembers`)).text(),
      );
      expect(unlisted.meta.get('robots')).toEqual(['noindex, follow']);
      expect(unlisted.schemas).toEqual([]);
    } finally {
      clearTimeout(timer);
      child.kill();
      await reader.cancel();
      await child.exited;
      await rm(directory, { recursive: true, force: true });
    }
  },
  20000,
);

import { expect, test } from 'bun:test';
import { listedLogEntries } from '../src/portfolio/log';
import { publicPaths, proofPaths, logPaths } from '../src/portfolio/seo';
import { publicPreview } from '../src/portfolio/previews';

const enabled = Bun.env['TEST_CHECKOUT'] === '1';
test.skipIf(!enabled)(
  'built SSR checkout accepts custom amounts and preserves payment URI and status',
  async () => {
    const id = crypto.randomUUID();
    const token = crypto.randomUUID();
    const address =
      '75a4WYbeKsdGjdFHqxpgNMSi3oqb1z9yx9m6qvNt3ZbTBpoFnD7EqicUZtCVsQoNPKXF5cMcTLJaTCkYiZVzddby9zc7bFV';
    let creations = 0;
    let paymentState = 'partial';
    let shortfall: string | undefined = '0.025';
    const gateway = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      async fetch(request) {
        expect(request.headers.get('authorization')).toBe(`Bearer ${token}`);
        if (request.method === 'POST') {
          const body = await request.json();
          expect(body).toEqual({ id, amount: '0.075' });
          creations++;
          return Response.json({
            id,
            amount: '0.075',
            address,
            state: 'ready',
          });
        }
        return Response.json({
          id,
          amount: '0.075',
          address,
          state: 'ready',
          status: {
            status: paymentState,
            paid: paymentState === 'paid',
            syncing: false,
            confirmations: 3,
            minConfirmations: 10,
            shortfallXmr: shortfall,
          },
        });
      },
    });
    const port = 14322;
    const origin = `http://127.0.0.1:${port}`;
    const server = Bun.spawn(['node', 'dist/server/entry.mjs'], {
      env: {
        ...process.env,
        SITE_URL: 'https://portfolio.example',
        HOST: '127.0.0.1',
        PORT: String(port),
        DONATION_GATEWAY_URL: `http://127.0.0.1:${gateway.port}`,
        DONATION_GATEWAY_TOKEN: token,
        XMR_NETWORK: 'stagenet',
        PORTFOLIO_TOR_URL: 'http://example.onion',
        PORTFOLIO_I2P_URL: 'javascript:alert(1)',
      },
      stdout: 'ignore',
      stderr: 'ignore',
    });
    try {
      let ready = false;
      for (let attempt = 0; attempt < 40; attempt++) {
        try {
          ready = (await fetch(`${origin}/contribute`)).ok;
        } catch {}
        if (ready) break;
        await Bun.sleep(100);
      }
      expect(ready).toBe(true);
      const home = await (await fetch(`${origin}/?campaign=test`)).text();
      expect(home).toContain(
        'rel="canonical" href="https://portfolio.example/"',
      );
      expect(home).toContain(
        'property="og:url" content="https://portfolio.example/"',
      );
      expect(home).toContain('application/ld+json');
      const stylesheet = home.match(/href="([^"]+\.css)"/);
      const css = stylesheet
        ? await (async () => {
            const response = await fetch(new URL(stylesheet[1]!, origin));
            expect(response.ok).toBe(true);
            return response.text();
          })()
        : [...home.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)]
            .map((match) => match[1])
            .join('\n');
      expect(css.length).toBeGreaterThan(0);
      expect(css).toMatch(/min-height:\s*100svh/);
      expect(css).toContain(':checked');
      expect(css).toMatch(/prefers-color-scheme:\s*dark/);
      for (const icon of home.matchAll(/<span[^>]*data-icon[^>]*>/g)) {
        expect(icon[0].match(/\bclass="/g)?.length).toBe(1);
      }

      expect(
        [
          'The creator originates.',
          'I am. I think. I will.',
          'To think is an act of choice.',
        ].some((motto) => home.match(/<h1\b[^>]*>(.*?)<\/h1>/s)?.[1] === motto),
      ).toBe(true);
      expect(home).toContain('--icon-source: url(&quot;/brand/onur.svg&quot;)');
      for (const name of ['tor', 'i2p', 'rss']) {
        expect(home).toContain(
          `--icon-source: url(&quot;/brand/${name}.svg&quot;)`,
        );
        const asset = await fetch(`${origin}/brand/${name}.svg`);
        expect(asset.ok).toBe(true);
        expect(await asset.text()).toContain('<svg');
      }
      const inlineSvgs = [...home.matchAll(/<svg\b[^>]*>/g)];
      expect(inlineSvgs.length).toBeGreaterThan(0);
      expect(
        inlineSvgs.every(
          (svg) =>
            /\bclass="log-sigil(?: |")/.test(svg[0]) ||
            svg[0].includes('data-selection-layer'),
        ),
      ).toBe(true);
      expect([
        ...home.matchAll(/<span[^>]*data-icon="(?:onur|rss|tor|i2p)"/g),
      ]).toHaveLength(4);
      expect(home).toContain('aria-label="Onur home"');
      const discord = JSON.parse(
        home.match(
          /<script[^>]*id="discord:component-embed"[^>]*>(.*?)<\/script>/s,
        )![1]!,
      );
      expect(
        discord.component.components.map(
          (component: { type: number }) => component.type,
        ),
      ).toEqual([12, 1]);
      expect(
        discord.component.components[1].components.map(
          (button: { label: string }) => button.label,
        ),
      ).toEqual(['Open page', 'PGP', 'RSS', 'Discord']);

      expect(discord.component.components[1].components[3].url).toBe(
        'https://discord.com/users/1434953668959932426',
      );
      for (const path of publicPaths) {
        const page = await (
          await fetch(`${origin}${path}`, { headers: { Accept: 'text/html' } })
        ).text();
        const description = publicPreview(path)!.description;
        if (path === '/') {
          expect(page).not.toContain('data-page-description');
          const main = page.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1];
          expect(main).toContain('<h1');
          expect(main).toContain('aria-labelledby="embed-x"');
          expect(main).toContain('aria-labelledby="embed-github"');
        } else if (path === '/log') {
          expect(page).toContain('class="h-feed"');
          expect(page).toMatch(/class="[^"]*\bh-entry\b[^"]*"/);
        } else {
          expect(
            page
              .match(/<p\b[^>]*data-page-description[^>]*>([\s\S]*?)<\/p>/)?.[1]
              ?.trim(),
          ).toBe(description);
        }
        if (description)
          expect(page).toContain(`name="description" content="${description}"`);
        else expect(page).not.toContain('name="description"');
        if (path !== '/')
          expect(
            (
              await fetch(`${origin}${path}/`, {
                headers: { Accept: 'text/html' },
              })
            ).status,
          ).toBe(200);
        if (description) {
          expect(page).toContain(
            `property="og:description" content="${description}"`,
          );
          expect(page).toContain(
            `name="twitter:description" content="${description}"`,
          );
        } else {
          expect(page).not.toContain('property="og:description"');
          expect(page).not.toContain('name="twitter:description"');
        }
      }
      expect(home).toContain('data-network-label="TOR"');
      expect(home).toContain('data-network-label="I2P"');
      expect(home).toMatch(
        /<a[^>]*href="http:\/\/example\.onion\/"[^>]*rel="noreferrer"/,
      );
      expect(home).not.toContain('javascript:alert(1)');
      const pgp = await (await fetch(`${origin}/pgp`)).text();
      expect(pgp).toMatch(/<textarea[^>]*id="public-key"[^>]*readonly/);
      expect(pgp.match(/<textarea[^>]*>(.*?)<\/textarea>/s)?.[1]?.trim()).toBe(
        (await Bun.file('public/pgp.asc').text()).trim(),
      );
      expect(pgp).toContain('id="copy-key"');
      expect(pgp).not.toContain('<pre');
      const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
      expect(sitemap.match(/<loc>/g)).toHaveLength(
        publicPaths.length +
          proofPaths.length +
          logPaths(listedLogEntries).length,
      );
      for (const path of ['/rss', '/pgp']) {
        expect(sitemap).toContain(
          `<loc>https://portfolio.example${path}</loc>`,
        );
      }
      expect(sitemap).toContain(
        '<loc>https://portfolio.example/contribute</loc>',
      );
      expect(sitemap).not.toContain(id);
      for (const removed of [
        '/identity',
        '/search',
        '/projects',
        '/notes',
        '/reading',
        '/feeds.opml',
      ]) {
        expect((await fetch(`${origin}${removed}`)).status).toBe(404);
        expect(sitemap).not.toContain(`https://portfolio.example${removed}`);
      }

      expect(await (await fetch(`${origin}/robots.txt`)).text()).toContain(
        'Sitemap: https://portfolio.example/sitemap.xml',
      );
      const form = new URLSearchParams({
        id: id.toUpperCase(),
        amount: 'custom',
        customAmount: '0.0750',
      });
      const wrongOrigin = await fetch(`${origin}/contribute/create`, {
        method: 'POST',
        headers: { origin: 'http://evil.invalid' },
        body: form,
        redirect: 'manual',
      });
      expect(wrongOrigin.status).toBe(403);
      const response = await fetch(`${origin}/contribute/create`, {
        method: 'POST',
        headers: { origin },
        body: form,
        redirect: 'manual',
      });
      expect(response.status).toBe(303);
      expect(response.headers.get('location')).toBe(`/contribute/${id}`);
      const checkout = await fetch(`${origin}/contribute/${id}`);
      const html = await checkout.text();
      expect(checkout.headers.get('cache-control')).toBe('private, no-store');
      // Contribution retries preserve the same-origin form Origin header.
      expect(checkout.headers.get('referrer-policy')).toBe('same-origin');
      expect(checkout.headers.get('x-robots-tag')).toBe('noindex, nofollow');
      expect(html).toContain('name="robots" content="noindex, nofollow"');
      expect(html).toContain('Partial payment received');
      expect(html).not.toContain('Stirner');
      expect(html).toContain('recipient_name=Onur');
      expect(html).toContain('--icon-source: url(&quot;/brand/onur.svg&quot;)');
      expect(html).toContain('href="/" aria-label="Onur home"');
      expect(html).toContain('aria-label="I2P"');
      expect(html).toContain('aria-label="Alternate sites and contact"');
      expect(html).toContain(address);
      expect(html).toContain(`monero:${address}?tx_amount=0.025`);
      expect(html).toContain('Requested contribution: 0.075 XMR');
      expect(html).toContain('<svg');
      expect(html).toContain('href="http://example.onion/"');
      expect(html).toContain('href="/pgp"');
      expect(html).not.toContain('javascript:alert(1)');
      expect(html).toContain('href="/contribute"');
      expect(html).not.toContain(token);
      expect(creations).toBe(1);
      for (const state of ['paid', 'unconfirmed', 'unknown']) {
        paymentState = state;
        const result = await fetch(`${origin}/contribute/${id}`);
        const receipt = await result.text();
        expect(receipt).not.toContain(`href="monero:`);
        expect(receipt).not.toContain('Send the exact amount');
        expect(receipt).not.toContain('Copy amount');
        expect(receipt).toContain(address);
      }
      paymentState = 'partial';
      shortfall = undefined;
      const unknownRemaining = await (
        await fetch(`${origin}/contribute/${id}`)
      ).text();
      expect(unknownRemaining).toContain('id="amount">Unavailable</span>');
      expect(unknownRemaining).not.toContain('href="monero:');
      expect((await fetch(`${origin}/contribute/not-a-uuid`)).status).toBe(404);
    } finally {
      server.kill();
      await server.exited;
      await gateway.stop(true);
    }
  },
  15000,
);

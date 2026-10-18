import { expect, test } from '@playwright/test';
import {
  mkdtemp,
  cp,
  symlink,
  writeFile,
  readFile,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:net';
import {
  generateKey,
  readKey,
  readPrivateKey,
  createMessage,
  createCleartextMessage,
  sign,
} from 'openpgp';
import { parseLog, revisionMarkdown } from '../../src/portfolio/log';
import { canonicalLogPublication } from '../../src/portfolio/log-publications';
import { digest } from '../../src/portfolio/log-signatures';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { type IdentityClaim } from '../../src/portfolio/proofs';
const execute = promisify(execFile);

test('signed Log renders revisions, feeds and exact independently verifiable downloads', async ({
  page,
}) => {
  test.setTimeout(120000);
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-log-browser-'));
  let server: ChildProcess | undefined;
  try {
    for (const file of [
      'src',
      'public',
      'integrations',
      'astro.config.ts',
      'tsconfig.json',
      'package.json',
    ])
      await cp(join(process.cwd(), file), join(directory, file), {
        recursive: true,
      });
    await symlink(
      join(process.cwd(), 'node_modules'),
      join(directory, 'node_modules'),
      'dir',
    );
    await mkdir(join(directory, 'public/media'), { recursive: true });
    await sharp({
      create: { width: 1200, height: 800, channels: 3, background: '#888' },
    })
      .png()
      .toFile(join(directory, 'public/media/test-chart.png'));
    const entries = parseLog([
      {
        id: 'silent-lodge-convenes',
        title: 'Fixture note',
        summary: 'Test publication',
        revisions: [
          {
            version: 1,
            publishedAt: '2026-10-13T09:00:00Z',
            tags: ['development'],
            body: 'Original **fixture** content.\n\n```html\n<iframe src="https://example.com/embed"></iframe>\n```',
          },
          {
            version: 2,
            publishedAt: '2026-10-14T10:30:00Z',
            language: 'tr',
            tags: ['pgp', 'cryptography'],
            sources: [
              {
                title: 'Protocol specification',
                url: 'https://example.com/spec',
              },
              {
                title: 'Related <script>note</script>',
                url: '/log/ancient-archive-opens',
              },
            ],
            cover: {
              src: '/media/test-chart.png',
              alt: 'A monochrome test chart',
              caption: 'A test chart',
              width: 1200,
              height: 800,
            },
            body:
              'Revised **fixture** content.\n\n## Details\n\n~~Old~~ and *new*.\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n## Sources\n\nEvidence[^1]\n\n[^1]: A source.\n\n```ts\nconst value = 1;\n```' +
              String.raw`

Inline $E=mc^2$.

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

![A monochrome test chart](/media/test-chart.png)

> [!SOURCE]
> [Related research](/log/ancient-archive-opens)
`,
          },
        ],
      },
      {
        id: 'ancient-archive-opens',
        title: 'Linked note',
        summary: 'A related note',
        revisions: [
          {
            version: 1,
            publishedAt: '2026-10-12T09:00:00Z',
            tags: ['pgp'],
            sources: [],
            body: '[Main note](/log/silent-lodge-convenes#details)',
          },
        ],
      },
    ]);
    const keys = await generateKey({
      type: 'ecc',
      curve: 'curve25519Legacy',
      userIDs: [{ name: 'Isolated browser fixture' }],
      format: 'armored',
    });
    const artifacts: Record<string, { sha256: string; signature: string }> = {};
    for (const entry of entries)
      for (const revision of entry.revisions) {
        const body = revisionMarkdown(entry, revision.version);
        artifacts[`${entry.id}-v${revision.version}`] = {
          sha256: digest(body),
          signature: await sign({
            message: await createMessage({
              binary: new TextEncoder().encode(body),
            }),
            signingKeys: await readPrivateKey({ armoredKey: keys.privateKey }),
            detached: true,
            format: 'armored',
          }),
        };
      }
    const manifest = canonicalLogPublication({
      format: 1,
      sequence: 1,
      previousSha256: null,
      entries: entries
        .flatMap((entry) =>
          entry.revisions.map((revision) => ({
            id: entry.id,
            version: revision.version,
            sha256: artifacts[`${entry.id}-v${revision.version}`]!.sha256,
          })),
        )
        .sort((a, b) => a.id.localeCompare(b.id) || a.version - b.version),
    });
    await writeFile(
      join(directory, 'src/content/log-publications.json'),
      JSON.stringify({
        editions: [
          {
            manifest,
            signature: await sign({
              message: await createMessage({
                binary: new TextEncoder().encode(manifest),
              }),
              signingKeys: await readPrivateKey({
                armoredKey: keys.privateKey,
              }),
              detached: true,
              format: 'armored',
            }),
          },
        ],
      }),
    );
    await writeFile(
      join(directory, 'src/content/log.json'),
      JSON.stringify(entries),
    );
    await writeFile(
      join(directory, 'src/content/log-signatures.json'),
      JSON.stringify(artifacts),
    );
    const fingerprint = (await readKey({ armoredKey: keys.publicKey }))
      .getFingerprint()
      .toUpperCase();
    const claims: IdentityClaim[] = [
      {
        id: 'github',
        profile: 'https://github.com/onurbyte',
        proofUrl: 'https://gist.github.com/onurbyte/abcdef0123456789',
        publishedAt: '2026-10-14T10:30:00Z',
      },
      {
        id: 'x',
        profile: 'https://x.com/onurstirner',
        proofUrl: 'https://x.com/onurstirner/status/12345',
        publishedAt: '2026-10-14T10:30:00Z',
      },
    ];
    const accountProofs = await Promise.all(
      claims.map(async (claim) => ({
        ...claim,
        signedMessage: await sign({
          message: await createCleartextMessage({ text: claim.profile }),
          signingKeys: await readPrivateKey({ armoredKey: keys.privateKey }),
          format: 'armored',
        }),
      })),
    );
    await writeFile(
      join(directory, 'src/content/identity-proofs.json'),
      JSON.stringify(accountProofs),
    );
    // Synthetic public-counterpart responses exist only in this isolated server.
    await writeFile(
      join(directory, 'proof-fixtures.mjs'),
      `
      const original = globalThis.fetch;
      globalThis.fetch = (input, init) => {
        const url = String(input);
        if (url === 'https://api.github.com/gists/abcdef0123456789') return Promise.resolve(Response.json({ owner: { login: 'onurbyte' }, files: { 'proof.md': { content: 'openpgp4fpr:${fingerprint}' } } }));
        if (url === 'https://api.fxtwitter.com/onurstirner/status/12345') return Promise.resolve(Response.json({ tweet: { id: '12345', author: { screen_name: 'onurstirner' }, text: 'openpgp4fpr:${fingerprint}' } }));
        return original(input, init);
      };
    `,
    );
    await writeFile(
      join(directory, 'src/content/home-embeds.ts'),
      `
      export const spotifySource = { id: 'spotify', title: 'Listening', source: 'Spotify', href: 'https://open.spotify.com', load: async () => ({ status: 'empty', items: [] }) };
      export const homeEmbedSources = ${JSON.stringify(claims.map((claim) => ({ id: claim.id, title: claim.id === 'x' ? 'Posts' : 'Repositories', source: claim.id === 'x' ? '@onurstirner' : 'onurbyte', href: claim.profile })))}.map(source => ({ ...source, load: async () => ({ status: 'empty', items: [] }) }));
    `,
    );
    await writeFile(join(directory, 'src/content/rss-entries.json'), '[]');
    await writeFile(join(directory, 'src/content/rss-signature.json'), 'null');
    await writeFile(join(directory, 'src/content/log-timestamps.json'), '{}');
    await writeFile(
      join(directory, 'src/content/publication-checkpoints.json'),
      '{}',
    );
    await writeFile(join(directory, 'src/content/log-proofs.json'), '{}');
    await writeFile(
      join(directory, 'src/content/key-history.json'),
      JSON.stringify({ transitions: [] }),
    );
    await writeFile(join(directory, 'public/pgp.asc'), keys.publicKey);
    await execute(
      process.execPath,
      [join(process.cwd(), 'node_modules/astro/bin/astro.mjs'), 'build'],
      {
        cwd: directory,
        env: { ...process.env, VERCEL: '', SITE_URL: '' },
        timeout: 30000,
      },
    );
    const listener = createServer();
    await new Promise<void>((resolve) =>
      listener.listen(0, '127.0.0.1', resolve),
    );
    const address = listener.address();
    if (!address || typeof address === 'string')
      throw new Error('No fixture port');
    const port = address.port;
    await new Promise<void>((resolve) => listener.close(() => resolve()));
    server = spawn(
      'node',
      ['--import', './proof-fixtures.mjs', 'dist/server/entry.mjs'],
      {
        cwd: directory,
        env: {
          ...process.env,
          HOST: '127.0.0.1',
          PORT: String(port),
          SITE_URL: 'https://portfolio.example',
        },
        stdio: 'ignore',
      },
    );
    const origin = `http://127.0.0.1:${port}`;
    await expect
      .poll(
        async () => {
          try {
            return (await fetch(`${origin}/log`)).status;
          } catch {
            return 0;
          }
        },
        { timeout: 30000 },
      )
      .toBe(200);
    await page.goto(`${origin}/log`);
    const listedEntry = page.locator('main article#silent-lodge-convenes');
    if ((await listedEntry.count()) === 0)
      console.log('Log fixture markup:', (await page.content()).slice(0, 2500));
    await expect(listedEntry).toHaveCount(1);
    const listedVerification = listedEntry.getByRole('link', {
      name: 'Publication PGP proof',
    });
    await expect(listedVerification).toContainText('Verified');
    await expect(listedEntry.locator('h2 a[href^="/log/"]')).toHaveCount(0);
    await page.goto(origin);
    for (const claim of claims) {
      const name =
        claim.id === 'x' ? 'X identity PGP proof' : 'GitHub identity PGP proof';
      const identityRegion = page.getByRole('region', {
        name: claim.id === 'x' ? 'Posts' : 'Repositories',
      });
      await expect(
        identityRegion.getByRole('link', { name, exact: true }),
      ).toHaveAttribute('href', `/pgp/${claim.id}`);
      await identityRegion.getByRole('link', { name, exact: true }).click();
      await expect(page).toHaveURL(`${origin}/pgp/${claim.id}`);
      await expect(
        page.getByRole('link', { name: 'Proof', exact: true }),
      ).toHaveAttribute('href', claim.proofUrl!);
      const signed = accountProofs.find(
        (proof) => proof.id === claim.id,
      )!.signedMessage;
      await expect(
        page.getByRole('textbox', { name: 'PGP signed URL' }),
      ).toHaveValue(signed);
      expect(signed).toContain(claim.profile);
      expect(signed).toContain('-----BEGIN PGP SIGNATURE-----');
      const downloaded = await fetch(`${origin}/pgp/${claim.id}.asc`).then(
        (response) => response.text(),
      );
      expect(downloaded).toBe(signed);
      for (const width of [320, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
      }
      await page
        .context()
        .grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.getByRole('button', { name: 'Copy', exact: true }).click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        signed,
      );
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.goto(origin);
    }
    await page.locator('#open-search').click();
    await page.getByRole('searchbox').fill('value');
    const found = page
      .locator('#search-results')
      .getByRole('link', { name: /Fixture note/ });
    await expect(found).toBeVisible();
    await expect(found).toHaveAttribute('href', '/log/silent-lodge-convenes');
    await found.click();
    await expect(page).toHaveURL(`${origin}/log/silent-lodge-convenes`);
    await expect(page.locator('article')).toHaveCount(1);
    await expect(page.locator('article h1 a[href^="/log/"]')).toHaveCount(0);
    const verifiedLink = page
      .locator('article')
      .getByRole('link', {
        name: 'Publication PGP proof',
      })
      .first();
    await expect(verifiedLink).toContainText('Verified');
    await expect(verifiedLink).toHaveAttribute(
      'href',
      '/log/silent-lodge-convenes/verified',
    );
    await expect(page.locator('article .e-content')).toHaveCount(1);
    await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      'content',
      'article',
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://portfolio.example/log/silent-lodge-convenes',
    );
    const schema = JSON.parse(
      (await page
        .locator('script[type="application/ld+json"]')
        .textContent()) ?? '{}',
    );
    expect(schema['@graph'][0]).toMatchObject({
      '@type': 'BlogPosting',
      inLanguage: 'tr',
      keywords: ['pgp', 'cryptography'],
    });
    const contents = page.locator('[data-log-contents]');
    const rail = contents.locator('.contents-rail');
    const panel = contents.locator('.contents-panel');
    const firstSection = rail.locator('a[data-section="details"]');
    const secondSection = rail.locator('a[data-section="sources"]');
    const firstPanelSection = panel.locator('a[data-section="details"]');
    const secondPanelSection = panel.locator('a[data-section="sources"]');
    const articlePosition = await page
      .locator('.log-body.e-content')
      .boundingBox();
    await expect(panel).not.toBeVisible();
    await expect(contents.getByRole('button')).toHaveCount(0);
    await expect(contents.locator('a[href="/log"]')).toHaveCount(0);
    await firstSection.hover();
    await expect(panel).toBeVisible();
    expect((await page.locator('.log-body.e-content').boundingBox())?.x).toBe(
      articlePosition?.x,
    );
    expect(
      (await page.locator('.log-body.e-content').boundingBox())?.width,
    ).toBe(articlePosition?.width);
    await page.mouse.move(0, 0);
    await expect(panel).not.toBeVisible();
    await secondSection.click();
    await expect(page).toHaveURL(/#sources$/);
    await expect(secondSection).toHaveAttribute('aria-current', 'location');
    await expect
      .poll(() =>
        firstSection.evaluate((link) =>
          link.style.getPropertyValue('--section-progress'),
        ),
      )
      .toBe('1');
    await firstSection.hover();
    await expect(panel).toBeVisible();
    await secondPanelSection.click();
    await expect(page).toHaveURL(/#sources$/);
    await expect(panel).toBeVisible();
    await firstPanelSection.click();
    await expect(page).toHaveURL(/#details$/);
    await firstSection.click();
    await expect(page).toHaveURL(/#details$/);
    await expect(firstSection).toHaveAttribute('aria-current', 'location');
    await firstSection.focus();
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).not.toBeVisible();
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    await expect(rail.locator('a[data-section="log-sources"]')).toHaveAttribute(
      'aria-current',
      'location',
    );
    await page.setViewportSize({ width: 390, height: 900 });
    await secondSection.click();
    await expect(page).toHaveURL(/#sources$/);
    await expect(secondSection).toHaveAttribute('aria-current', 'location');
    await firstSection.click();
    await expect(page).toHaveURL(/#details$/);
    await firstSection.click();
    await expect(firstSection).toHaveAttribute('aria-current', 'location');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator('.log-body table')).toHaveCount(1);
    await expect(page.locator('.log-body del')).toHaveText('Old');
    expect(
      await page
        .locator('.log-body strong')
        .first()
        .evaluate((node) => getComputedStyle(node).userSelect),
    ).toBe('text');
    await page
      .context()
      .grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.locator('.e-content strong').evaluate((node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    });
    await page.keyboard.press('Control+c');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      'fixture',
    );
    const topic = await fetch(`${origin}/log/tag/pgp`).then((response) =>
      response.text(),
    );
    expect(topic).toContain('Fixture note');
    expect(topic).toContain('noindex, follow');
    expect(topic).toContain('https://portfolio.example/log/tag/pgp');
    expect((await fetch(`${origin}/log/tag/unknown`)).status).toBe(404);

    await expect(page.getByText('Revised fixture content.')).toBeVisible();
    await expect(page.locator('time.dt-published')).toHaveAttribute(
      'datetime',
      '2026-10-13T09:00:00Z',
    );
    await expect(page.locator('time.dt-updated')).toHaveAttribute(
      'datetime',
      '2026-10-14T10:30:00Z',
    );
    await expect(page.locator('time.dt-updated')).toHaveText('v2 · 2026-10-14');
    await expect(page.getByText(/sec read/)).toBeVisible();
    await expect(page.locator('.e-content .katex')).toHaveCount(2);
    await expect(page.locator('.e-content math')).toHaveCount(2);
    const bodyImage = page.locator('.e-content img');
    await expect(bodyImage).toHaveAttribute(
      'src',
      /\/log-media\/[a-f0-9]{64}-960.webp/,
    );
    await expect(bodyImage).toHaveAttribute('srcset', /480w/);
    await expect(bodyImage).toHaveAttribute('width', '1200');
    await expect(page.locator('.log-cover img')).toHaveAttribute(
      'height',
      '800',
    );
    expect(
      await bodyImage.evaluate(
        (image) =>
          (image as HTMLImageElement).complete &&
          (image as HTMLImageElement).naturalWidth > 0,
      ),
    ).toBe(true);
    const imageResponse = await fetch(
      `${origin}${await bodyImage.getAttribute('src')}`,
    );
    expect(imageResponse.status).toBe(200);
    expect(imageResponse.headers.get('content-type')).toContain('image/webp');
    expect(imageResponse.headers.get('x-robots-tag') ?? '').not.toContain(
      'noindex',
    );
    for (const name of ['Related logs', 'Referenced by'])
      await expect(
        page
          .getByRole('navigation', { name })
          .getByRole('link', { name: 'Linked note' }),
      ).toBeVisible();
    await expect(page.locator('[data-callout="source"]')).toContainText(
      'Related research',
    );
    const sources = page.locator('details.log-sources');
    await expect(sources).toHaveCount(1);
    await expect(sources).not.toHaveAttribute('open');
    const specification = sources.getByRole('link', {
      name: 'Protocol specification',
    });
    await expect(specification).toBeHidden();
    await sources.locator('summary').click();
    await expect(specification).toBeVisible();
    await expect(specification).toHaveAttribute(
      'href',
      'https://example.com/spec',
    );
    await expect(sources.locator('script')).toHaveCount(0);
    await expect(
      sources.getByRole('link', {
        name: 'Related <script>note</script>',
        exact: true,
      }),
    ).toBeVisible();
    await sources.locator('summary').click();
    await expect(specification).toBeHidden();
    await page.goto(`${origin}/log/ancient-archive-opens`);
    await expect(page.locator('details.log-sources')).toHaveCount(0);
    await page.goto(`${origin}/log/silent-lodge-convenes`);
    await page.getByText('History', { exact: true }).click();
    await expect(page.locator('details.log-sources')).toHaveCount(1);
    await page.getByText(/^Changes in v2/).click();
    await expect(page.getByLabel('Changes from version 1 to 2')).toContainText(
      '-Original **fixture** content.',
    );
    await expect(page.getByLabel('Changes from version 1 to 2')).toContainText(
      '+Revised **fixture** content.',
    );

    await expect(page.getByText('Original fixture content.')).toBeVisible();
    await page
      .context()
      .grantPermissions(['clipboard-read', 'clipboard-write']);
    const snippets = page.locator('.log-body pre');
    await expect(snippets).toHaveCount(2);
    for (const snippet of await snippets.all()) {
      const code = await snippet.locator('code').textContent();
      const button = snippet.locator('..').getByRole('button');
      await expect(button).toBeVisible();
      const buttonBox = await button.boundingBox();
      const buttonWidth = buttonBox!.width;
      const buttonHeight = buttonBox!.height;
      const snippetBox = await snippet.boundingBox();
      expect(buttonBox!.x).toBeGreaterThanOrEqual(
        snippetBox!.x + snippetBox!.width,
      );
      await button.click();
      await expect(button).toHaveText('Copied');
      expect((await button.boundingBox())!.width).toBe(buttonWidth);
      expect((await button.boundingBox())!.height).toBe(buttonHeight);
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        code,
      );
    }
    await page.evaluate(() => {
      Object.defineProperty(navigator.clipboard, 'writeText', {
        configurable: true,
        value: () => Promise.reject(new Error('Clipboard denied')),
      });
    });
    const retry = snippets.first().locator('..').getByRole('button');
    await retry.click();
    await expect(retry).toHaveText('Copy failed');

    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      await page.setViewportSize({ width: 320, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
    await page.screenshot({
      path: '/tmp/portfolio-log-mobile.png',
      fullPage: true,
    });
    const raw = await fetch(`${origin}/proofs/silent-lodge-convenes-v1.md`);
    expect(await raw.text()).toBe(revisionMarkdown(entries[0]!, 1));
    const signature = await fetch(
      `${origin}/proofs/silent-lodge-convenes-v1.md.asc`,
    );
    expect(await signature.text()).toBe(
      artifacts['silent-lodge-convenes-v1']!.signature,
    );
    const feed = await fetch(`${origin}/rss.xml`).then((response) =>
      response.text(),
    );
    expect(feed).toContain(
      'https://portfolio.example/log/silent-lodge-convenes',
    );
    expect(feed).toContain('<title>Fixture note</title>');
    expect(feed.match(/<item>/g)).toHaveLength(2);
    expect(feed).toContain('urn:onur:post:log-silent-lodge-convenes');
    const feedPage = await fetch(`${origin}/rss`, {
      headers: { Accept: 'text/html' },
    }).then((response) => response.text());
    expect(feedPage).toContain('Fixture note');
    await verifiedLink.click();
    await expect(page).toHaveURL(
      `${origin}/log/silent-lodge-convenes/verified`,
    );
    await expect(
      page.getByRole('textbox', { name: 'PGP signature' }),
    ).toHaveValue(artifacts['silent-lodge-convenes-v2']!.signature);
    await page.getByRole('link', { name: 'v1', exact: true }).click();
    await expect(page).toHaveURL(
      `${origin}/log/silent-lodge-convenes/verified?v=1`,
    );
    await expect(
      page.getByRole('textbox', { name: 'PGP signature' }),
    ).toHaveValue(artifacts['silent-lodge-convenes-v1']!.signature);
    for (const path of [
      '/log/fixture-note',
      '/pgp/log/fixture-note?v=1',
      '/proofs/fixture-note-v1.md',
      '/proofs/fixture-note-v1.md.asc',
    ]) {
      const response = await fetch(`${origin}${path}`, { redirect: 'manual' });
      expect(response.status).toBe(404);
    }
    expect((await fetch(`${origin}/log/not-a-post`)).status).toBe(404);
    expect(
      (await fetch(`${origin}/log/silent-lodge-convenes/verified?v=99`)).status,
    ).toBe(404);
    await writeFile(
      join(directory, 'entry.md'),
      revisionMarkdown(entries[0]!, 1),
    );
    await writeFile(
      join(directory, 'entry.md.asc'),
      artifacts['silent-lodge-convenes-v1']!.signature,
    );
    const gpgHome = await mkdtemp(join(directory, 'gpg-'));
    await execute('gpg', [
      '--homedir',
      gpgHome,
      '--batch',
      '--import',
      join(directory, 'public/pgp.asc'),
    ]);
    const verified = await execute('gpg', [
      '--homedir',
      gpgHome,
      '--batch',
      '--verify',
      join(directory, 'entry.md.asc'),
      join(directory, 'entry.md'),
    ]);
    expect(verified.stderr).toContain('Good signature');
    for (const proof of accountProofs) {
      await writeFile(join(directory, `${proof.id}.asc`), proof.signedMessage);
      const result = await execute('gpg', [
        '--homedir',
        gpgHome,
        '--batch',
        '--verify',
        join(directory, `${proof.id}.asc`),
      ]);
      expect(result.stderr).toContain('Good signature');
    }

    expect(
      await readFile(join(directory, 'src/content/log.json'), 'utf8'),
    ).toContain('silent-lodge-convenes');
    // The same image pipeline must refresh in dev without editing signed text.
    server.kill();
    await new Promise((resolve) => server!.once('exit', resolve));
    server = spawn(
      'node',
      [
        '--import',
        './proof-fixtures.mjs',
        join(process.cwd(), 'node_modules/astro/bin/astro.mjs'),
        'dev',
        '--ignore-lock',
        '--host',
        '127.0.0.1',
        '--port',
        String(port),
      ],
      {
        cwd: directory,
        env: {
          ...process.env,
          VERCEL: '',
          SITE_URL: 'https://portfolio.example',
        },
        stdio: 'ignore',
      },
    );
    await expect
      .poll(
        async () => {
          try {
            return (await fetch(`${origin}/log/silent-lodge-convenes`)).status;
          } catch {
            return 0;
          }
        },
        // The first dev request includes cold Vite dependency optimization.
        { timeout: 60000 },
      )
      .toBe(200);
    await page.goto(`${origin}/log/silent-lodge-convenes`);
    const originalImage = await page
      .locator('.e-content img')
      .getAttribute('src');
    await sharp({
      create: { width: 1200, height: 800, channels: 3, background: '#111' },
    })
      .png()
      .toFile(join(directory, 'public/media/test-chart.png'));
    await expect
      .poll(
        async () => {
          const html = await fetch(`${origin}/log/silent-lodge-convenes`).then(
            (response) => response.text(),
          );
          return !html.includes(originalImage!);
        },
        { timeout: 15000 },
      )
      .toBe(true);
    await page.reload();
    expect(await page.locator('.e-content img').getAttribute('src')).not.toBe(
      originalImage,
    );
    // The test must own the live process; an auto-backgrounded child would leak.
    expect(server.exitCode).toBeNull();
  } finally {
    if (server && server.exitCode === null) {
      server.kill();
      await new Promise((resolve) => server!.once('exit', resolve));
    }
    await rm(directory, { recursive: true, force: true });
  }
});

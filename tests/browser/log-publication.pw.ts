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
import { digest } from '../../src/portfolio/log-signatures';
import AxeBuilder from '@axe-core/playwright';
import { type IdentityClaim } from '../../src/portfolio/proofs';
const execute = promisify(execFile);

test('signed Log renders revisions, feeds and exact independently verifiable downloads', async ({
  page,
}) => {
  test.setTimeout(60000);
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-log-browser-'));
  let server: ChildProcess | undefined;
  try {
    for (const file of [
      'src',
      'public',
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
    const entries = parseLog([
      {
        id: 'silent-lodge-convenes',
        title: 'Fixture note',
        summary: 'Test publication',
        revisions: [
          {
            version: 1,
            publishedAt: '2026-10-13T09:00:00Z',
            body: 'Original **fixture** content.',
          },
          {
            version: 2,
            publishedAt: '2026-10-14T10:30:00Z',
            body: 'Revised **fixture** content.\n\n```ts\nconst value = 1;\n```',
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
    for (const revision of entries[0]!.revisions) {
      const body = revisionMarkdown(entries[0]!, revision.version);
      artifacts[`silent-lodge-convenes-v${revision.version}`] = {
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
          SITE_URL: '',
        },
        stdio: 'ignore',
      },
    );
    const origin = `http://127.0.0.1:${port}`;
    await expect
      .poll(async () => {
        try {
          return (await fetch(`${origin}/log`)).status;
        } catch {
          return 0;
        }
      })
      .toBe(200);
    await page.goto(`${origin}/log`);
    const listedEntry = page.locator('main article');
    if ((await listedEntry.count()) === 0)
      console.log('Log fixture markup:', (await page.content()).slice(0, 2500));
    await expect(listedEntry).toHaveCount(1);
    const listedVerification = listedEntry
      .locator('time.dt-published')
      .locator('..')
      .getByRole('link', { name: 'Publication PGP proof' });
    await expect(listedVerification).toContainText('Verified');
    await expect(listedEntry.locator('h2 a[href^="/pgp/log/"]')).toHaveCount(0);
    await page.goto(origin);
    for (const claim of claims) {
      const name =
        claim.id === 'x' ? 'X identity PGP proof' : 'GitHub identity PGP proof';
      await expect(
        page.getByRole('link', { name, exact: true }),
      ).toHaveAttribute('href', `/pgp/${claim.id}`);
      await page.getByRole('link', { name, exact: true }).click();
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
    await expect(page.locator('article h1 a[href^="/pgp/log/"]')).toHaveCount(
      0,
    );
    const verifiedLink = page
      .locator('article time.dt-published')
      .locator('..')
      .getByRole('link', { name: 'Publication PGP proof' });
    await expect(verifiedLink).toContainText('Verified');
    await expect(verifiedLink).toHaveAttribute(
      'href',
      '/pgp/log/silent-lodge-convenes',
    );
    await expect(page.locator('article .e-content')).toHaveCount(1);
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
    await page.getByText('History', { exact: true }).click();
    await expect(page.getByText('Original fixture content.')).toBeVisible();
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
    expect(feed).toContain(`${origin}/log/silent-lodge-convenes`);
    expect(feed).toContain('<title>Fixture note</title>');
    expect(feed.match(/<item>/g)).toHaveLength(1);
    expect(feed).toContain('urn:onur:post:log-silent-lodge-convenes');
    const feedPage = await fetch(`${origin}/rss`, {
      headers: { Accept: 'text/html' },
    }).then((response) => response.text());
    expect(feedPage).toContain('Fixture note');
    await page.getByRole('link', { name: 'Publication PGP proof' }).click();
    await expect(page).toHaveURL(`${origin}/pgp/log/silent-lodge-convenes`);
    await expect(
      page.getByRole('textbox', { name: 'PGP signature' }),
    ).toHaveValue(artifacts['silent-lodge-convenes-v2']!.signature);
    await page.getByRole('link', { name: 'v1', exact: true }).click();
    await expect(page).toHaveURL(`${origin}/pgp/log/silent-lodge-convenes?v=1`);
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
      (await fetch(`${origin}/pgp/log/silent-lodge-convenes?v=99`)).status,
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
  } finally {
    if (server && server.exitCode === null) {
      server.kill();
      await new Promise((resolve) => server!.once('exit', resolve));
    }
    await rm(directory, { recursive: true, force: true });
  }
});

import { writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 1000 },
]) {
  test(`selected quote copies an icon link and opens its exact passage at ${String(viewport.width)}px`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.setViewportSize(viewport);
    await page.emulateMedia({
      colorScheme: viewport.width < 600 ? 'dark' : 'light',
    });
    await page.goto('/log/cryptic-watchtower-watches');
    const paragraph = page.locator('.log-body p').first();
    await expect(
      page.locator('[data-annotation-controls]').first(),
    ).not.toHaveAttribute('hidden', '');
    await paragraph.scrollIntoViewIfNeeded();
    const quote = await paragraph.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return selection?.toString();
    });
    const annotate = page
      .getByRole('button', { name: 'Annotate', exact: true })
      .first();
    await expect(annotate).toBeVisible();
    const copy = page
      .getByRole('button', { name: 'Copy quote link', exact: true })
      .first();
    await expect(copy).toBeVisible();
    await expect(copy).toHaveText('');
    await expect(copy).toBeInViewport();
    await copy.click();
    await expect(page.locator('[data-quote-status]').first()).toHaveText(
      'Quote link copied.',
    );
    await expect(copy).toBeHidden();
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await expect(copy).toBeHidden();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toMatch(
      /\/log\/cryptic-watchtower-watches\/quote\/v\d+-\d+-\d+$/,
    );
    await page.goto(link);
    await expect
      .poll(() => page.evaluate(() => getSelection()?.toString()))
      .toBe(quote);
    const description = page.locator('meta[property="og:description"]');
    expect(await description.getAttribute('content')).toContain(
      (quote ?? '').replace(/\s+/g, ' ').trim().slice(0, 60),
    );
  });
}

test('invalid and out-of-range quotes are real 404s', async ({ request }) => {
  for (const selector of ['v0-0-10', 'v1-10-5', 'v999-0-10', 'v1-0-9999999']) {
    const response = await request.get(
      `/log/cryptic-watchtower-watches/quote/${selector}`,
    );
    expect(response.status()).toBe(404);
  }
});

test('archived revision links keep their exact text without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/log/cryptic-watchtower-watches/quote/v1-0-10');
  await expect(page.locator('[data-quote-passage] > blockquote')).toHaveText(
    /\S/,
  );
  await expect(page.locator('[data-annotation-revision]')).toHaveAttribute(
    'data-annotation-revision',
    '1',
  );
  await context.close();
});

test('quote sharing metadata and image use the configured public origin', async ({
  page,
  request,
}) => {
  const listener = createServer();
  await new Promise<void>((resolve) =>
    listener.listen(0, '127.0.0.1', resolve),
  );
  const address = listener.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing fixture port');
  await new Promise<void>((resolve) =>
    listener.close(() => {
      resolve();
    }),
  );
  const origin = `http://127.0.0.1:${String(address.port)}`;
  const server = spawn('node', ['dist/server/entry.mjs'], {
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(address.port),
      SITE_URL: 'https://portfolio.example',
      ANNOTATIONS_ENABLED: '0',
    },
    stdio: 'ignore',
  });
  try {
    await expect
      .poll(async () => {
        try {
          return (await request.get(`${origin}/log`)).status();
        } catch {
          return 0;
        }
      })
      .toBe(200);
    const path = '/log/cryptic-watchtower-watches/quote/v1-0-10';
    await page.goto(`${origin}${path}`);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      `https://portfolio.example${path}`,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://portfolio.example${path}`,
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      `https://portfolio.example${path}.png`,
    );
    const png = await request.get(`${origin}${path}.png`);
    expect(png.status()).toBe(200);
    expect(png.headers()['content-type']).toBe('image/png');
    const bytes = await png.body();
    await writeFile('/tmp/onur-quote-card.png', bytes);
    expect(bytes.readUInt32BE(16)).toBe(1200);
    expect(bytes.readUInt32BE(20)).toBe(630);
    await expect
      .poll(() => page.evaluate(() => getSelection()?.toString()))
      .toHaveLength(10);
    await expect(
      page.getByRole('button', { name: 'Annotate', exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Copy quote link', exact: true }),
    ).toBeVisible();
  } finally {
    server.kill();
    await new Promise<void>((resolve) =>
      server.once('exit', () => {
        resolve();
      }),
    );
  }
});

test('a multi-paragraph quote from History stays on its archived revision', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/log/cryptic-watchtower-watches');
  const archived = page.locator('[data-annotation-revision="1"]');
  await archived.evaluate((element) => {
    const details = element.closest('details');
    if (details) details.open = true;
  });
  await archived.locator('p').first().scrollIntoViewIfNeeded();
  const text = await archived.evaluate((element) => {
    const paragraphs = element.querySelectorAll('p');
    const first = paragraphs[0];
    const second = paragraphs[1];
    if (!first || !second) throw new Error('Expected two archived paragraphs');
    const range = document.createRange();
    range.setStartBefore(first);
    range.setEndAfter(second);
    const selection = getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return range.toString();
  });
  const copy = page.locator(
    '[data-annotations][data-revision="1"] [data-quote-copy]',
  );
  await expect(copy).toBeVisible();
  await copy.click();
  await expect(
    page.locator('[data-annotations][data-revision="1"] [data-quote-status]'),
  ).toHaveText('Quote link copied.');
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain('/quote/v1-');
  await page.goto(link);
  await expect
    .poll(() => page.evaluate(() => getSelection()?.getRangeAt(0).toString()))
    .toBe(text);
});

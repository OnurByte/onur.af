import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const publicPaths = ['/', '/rss', '/pgp', '/donate', '/search'];
const states = [
  'waiting',
  'partial',
  'confirming',
  'paid',
  'syncing',
  'unavailable',
];
const checkoutPaths = states.map(
  (_, index) => `/donate/00000000-0000-4000-8000-00000000000${index}`,
);

for (const colorScheme of ['light', 'dark'] as const) {
  for (const path of [...publicPaths, ...checkoutPaths]) {
    test(`${colorScheme} mobile accessibility ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.emulateMedia({ colorScheme });
      const externalRequests: string[] = [];
      page.on('request', (request) => {
        if (new URL(request.url()).origin !== 'http://127.0.0.1:14323')
          externalRequests.push(request.url());
      });
      await page.goto(path);
      await expect(page.locator('main')).toBeVisible();
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
            .analyze()
        ).violations,
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      expect(
        await page
          .locator('body')
          .evaluate((body) => getComputedStyle(body).backgroundColor),
      ).toBe(colorScheme === 'dark' ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
      await page.keyboard.press('Tab');
      await expect(
        page.getByRole('link', { name: 'Skip to content' }),
      ).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#content')).toBeFocused();
      expect(externalRequests).toEqual([]);
      const stateIndex = checkoutPaths.indexOf(path);
      if (stateIndex !== -1) {
        await expect(page.locator('[data-state]')).toHaveAttribute(
          'data-state',
          states[stateIndex]!,
        );
        await expect(page.locator('[data-payment-qr]')).toHaveCount(
          stateIndex < 2 ? 1 : 0,
        );
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
          'content',
          'noindex, nofollow',
        );
      }
    });
  }
}

test('RSS address copies to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/rss');
  await page.getByRole('button', { name: 'Copy address', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'http://127.0.0.1:14323/rss',
  );
});

for (const path of ['/projects', '/notes']) {
  test(`${path} remains removed`, async ({ request }) => {
    expect((await request.get(path)).status()).toBe(404);
  });
}

for (const [query, title, href] of [
  ['Monero', 'Donate', '/donate'],
  ['signature', 'PGP', '/pgp'],
]) {
  test(`Pagefind finds ${query}`, async ({ page }) => {
    await page.goto('/search');
    await page.getByRole('searchbox', { name: 'Search pages' }).fill(query!);
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(
      page.locator('#search-results').getByRole('link', { name: title! }),
    ).toHaveAttribute('href', href!);
  });
}

test('Pagefind reports a missing match', async ({ page }) => {
  await page.goto('/search');
  await page
    .getByRole('searchbox', { name: 'Search pages' })
    .fill('zzzzunfindablezzzz');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('#search-status')).toHaveText('No results.');
  await expect(page.locator('#search-results').getByRole('link')).toHaveCount(
    0,
  );
});

test('search queries stay off the server when JavaScript is disabled', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:14323/search');
    await page
      .getByRole('searchbox', { name: 'Search pages' })
      .fill('private-term');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:14323\/search\??$/);
    await expect(
      page.getByRole('link', { name: 'Donate', exact: true }).first(),
    ).toBeVisible();
  } finally {
    await context.close();
  }
});

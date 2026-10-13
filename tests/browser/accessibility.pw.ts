import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const publicPaths = ['/', '/rss', '/pgp', '/donate', '/404'];
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

for (const path of ['/projects', '/notes', '/search']) {
  test(`${path} remains removed`, async ({ request }) => {
    expect((await request.get(path)).status()).toBe(404);
  });
}

for (const [query, title, href] of [
  ['Monero', 'Donate', '/donate'],
  ['signature', 'PGP', '/pgp'],
]) {
  test(`Pagefind finds ${query}`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Search', exact: false }).click();
    await page.getByRole('searchbox', { name: 'Search pages' }).fill(query!);
    await expect(
      page.locator('#search-results').getByRole('link', { name: title! }),
    ).toHaveAttribute('href', href!);
  });
}

test('Pagefind reports a missing match', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Search', exact: false }).click();
  await page
    .getByRole('searchbox', { name: 'Search pages' })
    .fill('zzzzunfindablezzzz');
  await expect(page.locator('#search-status')).toHaveText('No results.');
  await expect(page.locator('#search-results').getByRole('link')).toHaveCount(
    0,
  );
});

test('header search aligns with Donate and supports keyboard navigation', async ({
  page,
}) => {
  await page.goto('/');
  const trigger = page.locator('header #open-search');
  await expect(page.locator('footer #open-search')).toHaveCount(0);
  await expect(page.locator('footer a[href="/search"]')).toHaveCount(0);
  const headerBox = await trigger.boundingBox();
  const donateBox = await page
    .locator('footer a[href="/donate"]')
    .boundingBox();
  expect(
    Math.abs(
      headerBox!.x + headerBox!.width - (donateBox!.x + donateBox!.width),
    ),
  ).toBeLessThan(2);
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Search pages' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('searchbox')).toBeFocused();
  for (const control of [trigger, dialog, page.getByRole('searchbox')]) {
    expect(
      await control.evaluate((element) => {
        const style = getComputedStyle(element);
        return [style.borderTopWidth, style.borderTopStyle, style.borderRadius];
      }),
    ).toEqual(['1px', 'solid', '4px']);
  }
  await page.getByRole('searchbox').fill('Monero');
  await expect(page.locator('#search-results a')).toHaveCount(1);
  await page.screenshot({
    path: '/tmp/portfolio-command-search.png',
    fullPage: true,
  });
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#search-results a')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/donate$/);
  await page.keyboard.press('Meta+k');
  await expect(dialog).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('#open-search')).toBeFocused();
  await page.locator('#open-search').click();
  await page.mouse.click(1, 1);
  await expect(dialog).not.toBeVisible();
});

test('404 has correct status, indexing and reduced-motion behavior', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const response = await page.goto('/this-page-does-not-exist');
  expect(response!.status()).toBe(404);
  expect(response!.headers()['x-robots-tag']).toBe('noindex, nofollow');
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  expect(
    await page
      .getByRole('heading', { name: '404' })
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none');
  await page.screenshot({
    path: '/tmp/portfolio-custom-404.png',
    fullPage: true,
  });
  await page.getByRole('link', { name: '404. Nothing here. Go home.' }).click();
  await expect(page).toHaveURL('http://127.0.0.1:14323/');
});

test('search stays unavailable without JavaScript and cannot transmit a query', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:14323/');
    await expect(page.locator('#open-search')).toBeHidden();
    await expect(page.locator('#search-query')).toBeHidden();
    expect(await page.locator('#search-query').getAttribute('name')).toBeNull();
  } finally {
    await context.close();
  }
});

test('reopening a search cancelled before debounce completes refreshes the query', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#open-search').click();
  await page.getByRole('searchbox').fill('Monero');
  await page.keyboard.press('Escape');
  await page.locator('#open-search').click();
  await expect(page.locator('#search-results a')).toHaveCount(1);
  await expect(page.locator('#search-results a')).toHaveAttribute(
    'href',
    '/donate',
  );
});

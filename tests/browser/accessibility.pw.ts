import { searchEntries } from '../../src/portfolio/search';
import { notFoundQuotes } from '../../src/portfolio/not-found-quotes';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const publicPaths = ['/', '/rss', '/pgp', '/contribute', '/404'];
const states = [
  'waiting',
  'partial',
  'confirming',
  'paid',
  'syncing',
  'unavailable',
];
const checkoutPaths = states.map(
  (_, index) => `/contribute/00000000-0000-4000-8000-00000000000${index}`,
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
      await expect(page.locator('a[href="#content"]')).toHaveCount(0);
      await expect(
        page.locator('header nav a, header nav button').first(),
      ).toBeFocused();
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

test('Find descriptions match the page intros and metadata', async ({
  page,
}) => {
  for (const path of ['/contribute', '/rss', '/pgp']) {
    await page.goto(path);
    const description = await page
      .locator('[data-page-description]')
      .innerText();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      description,
    );
    await page.getByRole('button', { name: 'Search pages' }).click();
    await expect(
      page.locator(
        `#search-results a[href="${path}"] [data-result-description]`,
      ),
    ).toHaveText(description);
  }
});

test('RSS Copy button matches the PGP copy behavior', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/rss');
  await expect(page.locator('#feed-field')).toBeVisible();
  await expect(page.locator('#feed-address')).toHaveAttribute('readonly', '');
  await expect(page.locator('#feed-address')).toHaveAttribute('type', 'text');
  expect(
    await page.locator('#feed-field > div').evaluate((actions) => {
      const field = document
        .querySelector('#feed-address')!
        .getBoundingClientRect();
      const bounds = actions.getBoundingClientRect();
      return bounds.top >= field.top && bounds.bottom <= field.bottom;
    }),
  ).toBe(true);
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Copied', exact: true }),
  ).toBeVisible();
  await expect(page.locator('#copy-status')).toHaveCount(0);
  await expect(
    page.locator('#feed-field').getByRole('link', { name: 'Subscribe' }),
  ).toHaveAttribute('href', 'feed:http://127.0.0.1:14323/rss');
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
  ['Monero', 'Contribute', '/contribute'],
  ['signature', 'PGP', '/pgp'],
]) {
  test(`Local search finds ${query}`, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Search', exact: false }).click();
    await page.getByRole('searchbox', { name: 'Search pages' }).fill(query!);
    await expect(
      page.locator('#search-results').getByRole('link', { name: title! }),
    ).toHaveAttribute('href', href!);
  });
}

test('Local search reports a missing match', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Search', exact: false }).click();
  await page
    .getByRole('searchbox', { name: 'Search pages' })
    .fill('zzzzunfindablezzzz');
  await expect(page.locator('#search-status')).toHaveText('Nothing found.');
  await expect(page.locator('#search-results').getByRole('link')).toHaveCount(
    0,
  );
});

test('header search aligns with Contribute and supports keyboard navigation', async ({
  page,
}) => {
  await page.goto('/');
  const trigger = page.locator('header #open-search');
  await expect(page.locator('footer #open-search')).toHaveCount(0);
  await expect(page.locator('footer a[href="/search"]')).toHaveCount(0);
  const headerBox = await trigger.boundingBox();
  const contributeBox = await page
    .locator('footer a[href="/contribute"]')
    .boundingBox();
  expect(
    Math.abs(
      headerBox!.x +
        headerBox!.width -
        (contributeBox!.x + contributeBox!.width),
    ),
  ).toBeLessThan(2);
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Search pages' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#close-search')).toHaveCount(0);
  expect(await dialog.innerText()).not.toMatch(/Esc|navigate|Enter open/);
  await expect(page.getByRole('searchbox')).toBeFocused();
  for (const control of [trigger, dialog]) {
    expect(
      await control.evaluate((element) => {
        const style = getComputedStyle(element);
        return [style.borderTopWidth, style.borderTopStyle, style.borderRadius];
      }),
    ).toEqual(['1px', 'solid', '4px']);
  }
  expect(
    await page.getByRole('searchbox').evaluate((element) => {
      const style = getComputedStyle(element);
      return [
        style.borderTopWidth,
        style.borderBottomWidth,
        style.borderBottomStyle,
      ];
    }),
  ).toEqual(['0px', '0px', 'solid']);
  await page.getByRole('searchbox').fill('Monero');
  await expect(page.locator('#search-results a')).toHaveCount(1);
  await expect(page.locator('#search-status')).toBeHidden();
  await expect(page.locator('#search-results a img')).toHaveCount(0);
  const row = page.locator('#search-results a');
  const titleBox = await row.locator('[data-result-title]').boundingBox();
  const detailBox = await row
    .locator('[data-result-description]')
    .boundingBox();
  const rowBox = await row.boundingBox();
  expect(detailBox!.x).toBeGreaterThan(titleBox!.x + titleBox!.width);
  expect(
    Math.abs(
      detailBox!.x + detailBox!.width - (rowBox!.x + rowBox!.width - 12),
    ),
  ).toBeLessThan(2);
  await page.screenshot({
    path: '/tmp/portfolio-command-search.png',
    fullPage: true,
  });
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#search-results a')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/contribute$/);
  await page.keyboard.press('Meta+k');
  await expect(dialog).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('#open-search')).toBeFocused();
  await page.locator('#open-search').click();
  await page.mouse.click(1, 1);
  await expect(dialog).not.toBeVisible();
  await trigger.click();
  const accessibleClose = dialog.getByRole('button', { name: 'Close search' });
  await accessibleClose.focus();
  await page.keyboard.press('Enter');
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
  const decodedQuote = await page
    .locator('code[data-encoding]')
    .evaluate((element) => {
      const text = element.textContent!.trim();
      return element.getAttribute('data-encoding') === 'base64'
        ? atob(text)
        : String.fromCharCode(
            ...text.split(/\s+/).map((byte) => parseInt(byte, 2)),
          );
    });
  expect(notFoundQuotes.map(({ text }) => text)).toContain(decodedQuote);
  expect(
    await page
      .getByRole('heading', { name: '404' })
      .evaluate(
        (element) => getComputedStyle(element, '::after').backgroundImage,
      ),
  ).toContain('repeating-linear-gradient');
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

test('reopening search preserves the immediately filtered query', async ({
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
    '/contribute',
  );
});

test('Find links to Connect accounts and the Spotify embed', async ({
  page,
}) => {
  for (const item of [
    {
      query: 'X posts',
      title: '𝕏',
      url: '/#connect-x',
      heading: '@onurstirner',
    },
    {
      query: 'GitHub repositories',
      title: 'GitHub',
      url: '/#connect-github',
      heading: 'onurbyte',
    },
    {
      query: 'Spotify recents',
      title: 'Spotify',
      url: '/#spotify-embed',
      heading: /Spotify|Recents|Listening|Playing nothing/,
    },
    {
      query: 'recent tracks',
      title: 'Spotify',
      url: '/#spotify-embed',
      heading: /Spotify|Recents|Listening|Playing nothing/,
    },
  ]) {
    await page.goto('/');
    await page.locator('#open-search').click();
    await page
      .getByRole('searchbox', { name: 'Search pages' })
      .fill(item.query);
    const result = page.locator(`#search-results a[href="${item.url}"]`);
    await expect(result).toBeVisible();
    await expect(result.locator('[data-result-title]')).toHaveText(item.title);
    await result.click();
    await expect(page).toHaveURL(item.url);
    await expect(page.locator(`#${item.url.split('#')[1]}`)).toContainText(
      item.heading,
    );
  }
});

test('search lists pages and networks without icons, headings or counters', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('#open-search').click();
  const dialog = page.getByRole('dialog');
  expect(await dialog.innerText()).not.toMatch(/Search|results|Pages/);
  await expect(page.locator('#open-search img')).toHaveCount(0);
  await expect(page.locator('#open-search')).toContainText('Find');
  await expect(dialog.locator('img')).toHaveCount(0);
  await expect(page.locator('#search-results li')).toHaveCount(
    searchEntries.length + 2,
  );
  await expect(page.locator('#search-results li img')).toHaveCount(0);
  await page.getByRole('searchbox').fill('TOR');
  await expect(
    page.locator('#search-results [data-network-label]'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-network-label="TOR"] [aria-disabled="true"]'),
  ).toBeVisible();
  await page.getByRole('searchbox').fill('I2P');
  await expect(
    page.locator('#search-results [data-network-label]'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-network-label="I2P"] [aria-disabled="true"]'),
  ).toBeVisible();
  await page.getByRole('searchbox').fill('');
  await expect(page.locator('#search-results li')).toHaveCount(
    searchEntries.length + 2,
  );
  await page.screenshot({
    path: '/tmp/portfolio-icon-search.png',
    fullPage: true,
  });
});

for (const width of [320, 375]) {
  test(`search fits a ${width}px mobile viewport and filters synchronously`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 640 });
    const indexRequests: string[] = [];
    await page.route('**/pagefind/**', async (route) => {
      indexRequests.push(route.request().url());
      await route.abort();
    });
    await page.goto('/');
    await page.locator('#open-search').click();
    const dialog = page.getByRole('dialog');
    const brand = page.locator('header [data-icon="onur"]').locator('..');
    const brandBox = await brand.boundingBox();
    const navBox = await page.locator('header nav').boundingBox();
    expect(Math.abs(brandBox!.x - navBox!.x)).toBeLessThan(1);
    expect(
      Math.abs(
        brandBox!.y + brandBox!.height / 2 - (navBox!.y + navBox!.height / 2),
      ),
    ).toBeLessThan(1);
    const trigger = page.locator('#open-search');
    await expect(trigger.locator('kbd')).toBeVisible();
    expect(
      await trigger
        .locator('kbd')
        .evaluate((element) => getComputedStyle(element).whiteSpace),
    ).toBe('nowrap');
    const findBox = await trigger.locator('span').boundingBox();
    const shortcutBox = await trigger.locator('kbd').boundingBox();
    expect(shortcutBox!.x).toBeGreaterThan(findBox!.x + findBox!.width);
    const firstRow = page.locator('#search-results li').first();
    const titleBox = await firstRow
      .locator('[data-result-title]')
      .boundingBox();
    const detailBox = await firstRow
      .locator('[data-result-description]')
      .boundingBox();
    expect(detailBox!.x).toBeGreaterThan(titleBox!.x + titleBox!.width);
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const immediate = await page
      .locator('#search-query')
      .evaluate((element) => {
        const input = element as HTMLInputElement;
        input.value = 'Monero';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return {
          hrefs: [...document.querySelectorAll('#search-results a')].map(
            (link) => link.getAttribute('href'),
          ),
          status: document.querySelector('#search-status')?.textContent,
        };
      });
    expect(immediate.hrefs).toEqual(['/contribute']);
    expect(immediate.status).not.toMatch(/Loading/i);
    expect(indexRequests).toEqual([]);
    await expect(dialog.locator('img')).toHaveCount(0);
    await page.getByRole('searchbox').fill('');
    await expect(page.locator('#search-results li')).toHaveCount(
      searchEntries.length + 2,
    );
    await page.screenshot({
      path: `/tmp/portfolio-search-mobile-${width}.png`,
      fullPage: true,
    });
  });
}

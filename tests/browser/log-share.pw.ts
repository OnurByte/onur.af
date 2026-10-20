import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('log sharing preserves RSS navigation and transfers focus between dialogs', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/log/cryptic-watchtower-watches');
  const share = page.getByRole('button', { name: 'Share log' });
  await page.screenshot({ path: '/tmp/portfolio-share-trigger.png' });
  await share.click();
  const dialog = page.getByRole('dialog', { name: 'Share log' });
  await expect(dialog.getByRole('link').first()).toHaveAttribute(
    'href',
    '/rss',
  );
  await expect(dialog.getByRole('searchbox')).toBeFocused();
  await dialog.getByRole('button', { name: 'Copy link', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'http://127.0.0.1:14323/log/cryptic-watchtower-watches',
  );
  await expect(dialog).not.toBeVisible();
  await expect(share).toBeFocused();
  await share.click();
  await expect(dialog.getByRole('status')).toBeHidden();
  await expect(dialog.getByRole('heading')).toHaveCount(0);
  await expect(
    dialog.getByText('↑ ↓ Navigate ⁜ Enter Select ⁜ Esc Close'),
  ).toHaveCount(0);
  await expect(
    dialog.getByRole('button', { name: /Copy citation/ }),
  ).toHaveCount(0);
  const mail = dialog.getByRole('link', { name: 'Mail', exact: true });
  const mailUrl = new URL((await mail.getAttribute('href'))!);
  expect(mailUrl.protocol).toBe('mailto:');
  expect(mailUrl.searchParams.get('subject')).toBe(
    'Become a massive value provider',
  );
  expect(mailUrl.searchParams.get('body')).toBe(
    'http://127.0.0.1:14323/log/cryptic-watchtower-watches',
  );
  await mail.evaluate((node) =>
    node.addEventListener('click', (event) => event.preventDefault()),
  );
  await mail.click();
  await expect(dialog).not.toBeVisible();
  await expect(share).toBeFocused();
  await share.click();
  await dialog.getByRole('button', { name: 'Discord', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'http://127.0.0.1:14323/log/cryptic-watchtower-watches',
  );
  await expect(share).toBeFocused();
  await share.click();
  await page.keyboard.press('Control+k');
  await expect(
    page.getByRole('dialog', { name: 'Search pages' }),
  ).toBeVisible();
  await expect(dialog).not.toBeVisible();
  await page.keyboard.press('Control+Shift');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('searchbox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(share).toBeFocused();
  await page.keyboard.press('Control+Shift+Period');
  await expect(dialog).not.toBeVisible();
  await page.keyboard.press('Control+Shift');
  await expect(dialog).toBeVisible();
});

test('share is usable on narrow screens in both themes and handles clipboard failure', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async () => {
          throw new Error('Denied');
        },
      },
    });
    Object.defineProperty(navigator, 'share', { value: undefined });
  });
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto('/log/cryptic-watchtower-watches');
    await page.getByRole('button', { name: 'Share log' }).click();
    const dialog = page.getByRole('dialog', { name: 'Share log' });
    await expect(
      dialog.getByRole('button', { name: /More options/ }),
    ).toHaveCount(0);
    await page.screenshot({
      path: `/tmp/portfolio-share-balanced-${colorScheme}.png`,
    });
    await page.keyboard.press('ArrowDown');
    await expect(
      dialog.getByRole('link', { name: 'RSS', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(
      dialog.getByRole('button', { name: 'Copy link', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(
      dialog.getByRole('link', { name: 'X', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(dialog.getByRole('button', { name: /Discord/ })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('status')).toContainText('Copy failed');
    expect(
      await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `/tmp/portfolio-share-${colorScheme}.png` });
    await page.keyboard.press('Escape');
  }
  await page.goto('/log');
  await expect(page.getByRole('button', { name: 'Share log' })).toHaveCount(0);
});

test('device sharing receives the log URL and cancellation stays quiet', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', {
      value: async (data: ShareData) => {
        sessionStorage.setItem('shared-data', JSON.stringify(data));
        throw new DOMException('Canceled', 'AbortError');
      },
    });
  });
  await page.goto('/log/cryptic-watchtower-watches');
  await page.getByRole('button', { name: 'Share log' }).click();
  const dialog = page.getByRole('dialog', { name: 'Share log' });
  await dialog.getByRole('button', { name: /More options/ }).click();
  const shared = await page.evaluate(() =>
    sessionStorage.getItem('shared-data'),
  );
  expect(JSON.parse(shared!)).toEqual({
    title: 'Become a massive value provider',
    url: 'http://127.0.0.1:14323/log/cryptic-watchtower-watches',
  });
  await expect(dialog.getByRole('status')).toBeHidden();
});

test('RSS and platform links remain reachable without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:14323/log/cryptic-watchtower-watches');
  await expect(
    page.getByRole('link', { name: 'Share on X', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Share on Telegram', exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('noscript').getByRole('link', { name: 'RSS', exact: true }),
  ).toHaveAttribute('href', '/rss');
  await context.close();
});

for (const width of [320, 1280]) {
  test(`global contents returns from section two to one at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/log/cryptic-watchtower-watches');
    const rail = page.locator('[data-scroll-rail]');
    const bounds = (await rail.boundingBox())!;
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await rail.locator('[data-scroll-track]').focus();
    const links = rail.locator('nav a');
    await links.nth(1).click();
    await expect(links.nth(1)).toHaveAttribute('aria-current', 'location');
    const secondScroll = await page.evaluate(() => scrollY);
    await rail.locator('[data-scroll-track]').focus();
    await links.nth(0).click();
    await expect(page).toHaveURL(
      (url) =>
        decodeURIComponent(url.hash) === '#give-people-more-than-they-came-for',
    );
    await expect(links.nth(0)).toHaveAttribute('aria-current', 'location');
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeLessThan(secondScroll);
    await expect
      .poll(async () => {
        const heading = await page
          .locator('.log-body #give-people-more-than-they-came-for')
          .boundingBox();
        return heading ? Math.abs(heading.y - 160) : Infinity;
      })
      .toBeLessThanOrEqual(1);
  });
}

test('share filters actions, handles empty results and resets on reopen', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'share', { value: undefined }),
  );
  await page.goto('/log/cryptic-watchtower-watches');
  const trigger = page.getByRole('button', { name: 'Share log' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Share log' });
  const query = dialog.getByRole('searchbox', {
    name: 'Search sharing options',
  });
  await expect(query).toBeFocused();
  await query.fill('  TeLE  ');
  await expect(dialog.getByRole('link')).toHaveCount(1);
  await expect(
    dialog.getByRole('link', { name: 'Telegram', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(
    dialog.getByRole('link', { name: 'Telegram', exact: true }),
  ).toBeFocused();
  await query.fill('no-such-option');
  await expect(dialog.getByRole('status')).toHaveText('No results');
  await expect(dialog.getByRole('link')).toHaveCount(0);
  await query.fill('copy');
  await expect(dialog.getByRole('status')).toBeHidden();
  await expect(
    dialog.getByRole('button', { name: 'Copy link', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await trigger.click();
  await expect(query).toHaveValue('');
  await expect(query).toBeFocused();
  await expect(
    dialog.getByRole('link', { name: 'RSS', exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'More options', exact: true }),
  ).toHaveCount(0);
});

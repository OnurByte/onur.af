import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('log sharing preserves RSS navigation and transfers focus between dialogs', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/log/sealed-lodge-waits');
  const share = page.getByRole('button', { name: 'Share log' });
  await share.click();
  const dialog = page.getByRole('dialog', { name: 'Share log' });
  await expect(dialog.getByRole('link').first()).toHaveAttribute(
    'href',
    '/rss',
  );
  await expect(dialog.getByRole('link', { name: /RSS/ })).toBeFocused();
  await dialog.getByRole('button', { name: 'Copy link', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'http://127.0.0.1:14323/log/sealed-lodge-waits',
  );
  await expect(dialog.getByRole('status')).toBeHidden();
  await expect(dialog.getByRole('heading')).toHaveCount(0);
  await expect(
    dialog.getByText('↑ ↓ Navigate · Enter Select · Esc Close'),
  ).toHaveCount(0);
  await dialog.getByRole('button', { name: /Copy citation/ }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    '/pgp/log/sealed-lodge-waits?v=1',
  );
  await page.keyboard.press('Control+k');
  await expect(
    page.getByRole('dialog', { name: 'Search pages' }),
  ).toBeVisible();
  await expect(dialog).not.toBeVisible();
  await page.keyboard.press('Control+Shift');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link', { name: /RSS/ })).toBeFocused();
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
    await page.goto('/log/sealed-lodge-waits');
    await page.getByRole('button', { name: 'Share log' }).click();
    const dialog = page.getByRole('dialog', { name: 'Share log' });
    await expect(
      dialog.getByRole('button', { name: /More options/ }),
    ).toHaveCount(0);
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
  await page.goto('/log/sealed-lodge-waits');
  await page.getByRole('button', { name: 'Share log' }).click();
  const dialog = page.getByRole('dialog', { name: 'Share log' });
  await dialog.getByRole('button', { name: /More options/ }).click();
  const shared = await page.evaluate(() =>
    sessionStorage.getItem('shared-data'),
  );
  expect(JSON.parse(shared!)).toEqual({
    title: 'Example: copying embed snippets',
    url: 'http://127.0.0.1:14323/log/sealed-lodge-waits',
  });
  await expect(dialog.getByRole('status')).toBeHidden();
});

test('RSS and platform links remain reachable without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:14323/log/sealed-lodge-waits');
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

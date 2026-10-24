import { expect, test } from '@playwright/test';
for (const width of [375, 1280]) {
  test(`native content, Logs, dialogs and scroll at ${String(width)}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({
      colorScheme: width === 375 ? 'dark' : 'light',
      reducedMotion: 'reduce',
    });
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Logs', exact: true }),
    ).toBeVisible();
    expect(
      await page
        .locator('main h1')
        .evaluate((el) => getComputedStyle(el).userSelect),
    ).not.toBe('none');
    expect(
      await page
        .locator('main h1')
        .evaluate((el) =>
          el.dispatchEvent(
            new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
          ),
        ),
    ).toBe(true);
    await page.locator('#open-search').click();
    await page.locator('#search-query').fill('Become a massive value provider');
    await page
      .locator('#search-results a[href="/log/cryptic-watchtower-watches"]')
      .click();
    await expect(page).toHaveURL('/log/cryptic-watchtower-watches');
    await expect(
      page.getByRole('heading', {
        name: 'Become a massive value provider',
        exact: true,
      }),
    ).toBeVisible();
    await page.keyboard.press('End');
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.goto('/log/cryptic-watchtower-watches');
    await page.locator('#open-share').click();
    await expect(page.locator('#share-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#share-dialog')).not.toBeVisible();
    await expect(page.locator('header nav')).toBeVisible();
  });
}

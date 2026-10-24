import { expect, test } from '@playwright/test';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`${colorScheme} home and discovery use the single Log system`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      colorScheme,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Logs', exact: true }),
    ).toBeVisible();
    await expect(page.locator('a[href^="/work"]')).toHaveCount(0);
    await page
      .locator('#recent-logs .p-name a, #recent-logs a.p-name')
      .first()
      .click();
    await expect(page).toHaveURL(/\/log\/[a-z]+-[a-z]+-[a-z]+$/);
    await expect(page.locator('article.h-entry')).toBeVisible();
    for (const path of [
      '/work',
      '/work/signed-publication',
      '/work/monero-contributions',
      '/log/shadowed-gate-opens',
      '/log/veiled-bell-echoes',
    ]) {
      expect((await context.request.get(path)).status()).toBe(404);
    }
    const search = await context.request.get('/search-index.json');
    expect(await search.text()).not.toContain('/work');
    await context.close();
  });
}

import { expect, test } from '@playwright/test';
for (const colorScheme of ['light', 'dark'] as const) {
  test(`text selection follows the ${colorScheme} monochrome theme`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    const colors = await page.locator('main h1').evaluate((element) => {
      const selected = getComputedStyle(element, '::selection');
      const expected = getComputedStyle(document.documentElement);
      return {
        background: selected.backgroundColor,
        foreground: selected.color,
        expectedBackground: expected.getPropertyValue('--text').trim(),
        expectedForeground: expected.getPropertyValue('--background').trim(),
      };
    });
    expect(colors.background).toBe(
      colorScheme === 'light' ? 'rgb(13, 13, 13)' : 'rgb(255, 255, 255)',
    );
    expect(colors.foreground).toBe(
      colorScheme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(0, 0, 0)',
    );
  });
}
test('consecutive document loads choose a different server-rendered motto', async ({
  page,
}) => {
  let previous = '';
  for (let i = 0; i < 8; i++) {
    await page.goto('/');
    const motto = (await page.locator('main h1').innerText()).trim();
    expect(motto).not.toBe(previous);
    previous = motto;
  }
});
test('local Log metadata displays - views', async ({ page }) => {
  await page.goto('/log/cryptic-watchtower-watches');
  const link = page.locator(
    'a[href="/log/cryptic-watchtower-watches/verified#stats"]',
  );
  await expect(link).toHaveText('- views');
  await expect(link).not.toHaveText('View statistics');
});

import { expect, test } from '@playwright/test';

test('Find searches Log prefixes without a separate index request', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/search-index.json', async (route) => {
    requests++;
    await route.abort();
  });
  await page.goto('/log');
  await page.locator('#open-search').click();
  await page.locator('#search-query').fill('provid');
  await expect(page.locator('#search-results')).toContainText(
    'Become a massive value provider',
  );
  await expect(page.locator('#search-status')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.locator('#open-search').click();
  expect(requests).toBe(0);
});

test('Find remains searchable offline after the page loads', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect(page.locator('#open-search')).toBeVisible();
  await context.setOffline(true);
  await page.locator('#open-search').click();
  await page.locator('#search-query').fill('provid');
  await expect(page.locator('#search-results')).toContainText(
    'Become a massive value provider',
  );
  await expect(page.locator('#search-status')).toBeHidden();
  await page.locator('#search-query').fill('zzzzunmatched');
  await expect(page.locator('#search-status')).toHaveText('Nothing found.');
  await context.setOffline(false);
});

for (const width of [375, 1280]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const activation of ['pointer', 'keyboard'] as const) {
      test(`Find ${activation} selection (${width}px ${colorScheme}) closes before focusing a same-page destination`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.emulateMedia({
          colorScheme,
          reducedMotion: colorScheme === 'dark' ? 'reduce' : 'no-preference',
        });
        await page.goto('/');
        await page.locator('#open-search').click();
        await page.locator('#search-query').fill('github');
        const result = page.locator(
          '#search-results a[href="/#connect-github"]',
        );
        if (activation === 'pointer') await result.click();
        else {
          await page.keyboard.press('ArrowDown');
          await expect(result).toBeFocused();
          await page.keyboard.press('Enter');
        }
        await expect(page).toHaveURL(/\/#connect-github$/);
        await expect(page.locator('#search-dialog')).not.toBeVisible();
        await expect(page.locator('#connect-github')).toBeFocused();
        // A later dialog close event must not restore focus to Find.
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        await expect(page.locator('#connect-github')).toBeFocused();
        await expect
          .poll(() => page.evaluate(() => scrollY))
          .toBeGreaterThan(0);
      });
    }
  }
}

test('Find result navigates from another page to the home destination', async ({
  page,
}) => {
  await page.goto('/log');
  await page.locator('#open-search').click();
  await page.locator('#search-query').fill('github');
  await page.locator('#search-results a[href="/#connect-github"]').click();
  await expect(page).toHaveURL(/\/#connect-github$/);
  await expect(page.locator('#search-dialog')).not.toBeVisible();
  await expect(page.locator('#connect-github')).toBeInViewport();
});

test('Find modified selection retains the search dialog in the original tab', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await page.locator('#open-search').click();
  await page.locator('#search-query').fill('github');
  const opened = context.waitForEvent('page');
  await page
    .locator('#search-results a[href="/#connect-github"]')
    .click({ modifiers: ['ControlOrMeta'] });
  const otherPage = await opened;
  await otherPage.waitForLoadState();
  await expect(otherPage).toHaveURL(/\/#connect-github$/);
  await expect(page.locator('#search-dialog')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await otherPage.close();
});

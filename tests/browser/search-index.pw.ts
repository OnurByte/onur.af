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

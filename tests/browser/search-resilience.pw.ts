import { expect, test } from '@playwright/test';

test('Find remains usable when its search module cannot load', async ({
  page,
}) => {
  await page.route('**/_astro/Search.*.js', (route) => route.abort());
  await page.goto('/rss');
  const trigger = page.locator('#open-search');
  await expect(trigger).toBeVisible();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Search pages' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('searchbox')).toBeDisabled();
  await expect(dialog.locator('a[href="/contribute"]')).toBeVisible();
  await expect(dialog.locator('a[href="/#connect-x"]')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(dialog).toBeVisible();
});

test('Find remains open while its delayed enhancement becomes ready', async ({
  page,
}) => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/_astro/Search.*.js', async (route) => {
    await ready;
    await route.continue();
  });
  await page.goto('/rss', { waitUntil: 'commit' });
  const trigger = page.locator('#open-search');
  await expect(trigger).toBeVisible();
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Search pages' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('searchbox')).toBeDisabled();
  release();
  await expect(page.getByRole('searchbox')).toBeEnabled();
  await expect(dialog).toBeVisible();
  await page.getByRole('searchbox').fill('Monero');
  await expect(dialog.locator('#search-results a')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(dialog).toBeVisible();
});

test('blocked enhancement keeps fallback page navigation usable on home', async ({
  page,
}) => {
  await page.route('**/_astro/Search.*.js', (route) => route.abort());
  await page.goto('/');
  await page.locator('#open-search').click();
  const dialog = page.getByRole('dialog', { name: 'Search pages' });
  await expect(dialog.locator('a[href="/#connect-x"]')).toBeHidden();
  await dialog.locator('a[href="/rss"]').click();
  await expect(page).toHaveURL(/\/rss$/);
  await expect(
    page.getByRole('dialog', { name: 'Search pages' }),
  ).not.toBeVisible();
  await expect(page.locator('#open-search')).toBeVisible();
});

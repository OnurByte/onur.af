import { expect, test } from '@playwright/test';
import { publicPaths, proofPaths, logPaths } from '../../src/portfolio/seo';

test('public HTML remains indexable without a runtime canonical origin', async ({
  page,
}) => {
  for (const path of [...publicPaths, ...proofPaths, ...logPaths()]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'index, follow',
    );
    await expect(page.locator('title')).not.toBeEmpty();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /\S+/,
    );
    expect(await page.locator('head').innerHTML()).not.toContain(
      'undefined/social/',
    );
  }
});
test('private, error and unapproved tag pages retain explicit indexing restrictions', async ({
  page,
  request,
}) => {
  await page.goto('/contribute/00000000-0000-4000-8000-000000000000');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, nofollow',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  const missing = await page.goto('/not-a-page');
  expect(missing?.status()).toBe(404);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, nofollow',
  );
  await page.goto('/log/tag/development');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, follow',
  );
  expect(await (await request.get('/robots.txt')).text()).toContain('Allow: /');
});

import { expect, test } from '@playwright/test';
import { listedLogEntries } from '../../src/portfolio/log';
import { publicPaths, proofPaths, logPaths } from '../../src/portfolio/seo';

test('public HTML remains indexable without a runtime canonical origin', async ({
  page,
}) => {
  for (const path of [
    ...publicPaths,
    ...proofPaths,
    ...logPaths(listedLogEntries),
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'index, follow, max-image-preview:large',
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

test('home title and description stay stable across requests', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Onur');
  const description = await page
    .locator('meta[name="description"]')
    .getAttribute('content');
  await page.reload();
  await expect(page).toHaveTitle('Onur');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    description!,
  );
});

test('public trailing slash URLs permanently consolidate and preserve queries', async ({
  request,
}) => {
  for (const path of ['/log', '/pgp', '/pgp/x', '/log/tag/development']) {
    const response = await request.get(`${path}/?source=check`, {
      maxRedirects: 0,
    });
    expect(response.status(), path).toBe(308);
    expect(response.headers()['location']).toBe(`${path}?source=check`);
  }
  expect((await request.get('/unknown/', { maxRedirects: 0 })).status()).toBe(
    404,
  );
});

test('article cards contain the visible title in their actual link', async ({
  page,
}) => {
  for (const path of ['/', '/log']) {
    await page.goto(path);
    const title = page.locator('main article h2').first();
    await expect(title.locator('a[href]')).toHaveText(
      (await title.innerText()).trim(),
    );
  }
});

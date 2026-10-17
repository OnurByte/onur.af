import { expect, test } from '@playwright/test';

test('public pages expose reciprocal identity links and Log author identity', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.locator('head link[rel="me"][href="https://github.com/onurbyte"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('head link[rel="me"][href="https://x.com/onurstirner"]'),
  ).toHaveCount(1);
  const index = await page.request.get('/search-index.json');
  const documents = await index.json();
  if (!documents.length) return;
  await page.goto(documents[0].url);
  await expect(
    page.locator('article.h-entry .p-author.h-card .p-name'),
  ).toHaveText('Onur');
  await expect(page.locator('article.h-entry link.u-url')).toHaveCount(1);
});

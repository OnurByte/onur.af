import { expect, test } from '@playwright/test';

test('Find loads Log index only on demand and supports prefix search safely', async ({
  page,
}) => {
  let requests = 0;
  await page.route('**/search-index.json', async (route) => {
    requests++;
    await route.fulfill({
      json: [
        {
          url: '/log/sealed-council-convenes',
          meta: {
            title: '<script>Example</script>',
            description: 'Repository note',
          },
          searchText: 'quaternion onurbyte/portfolio',
        },
      ],
    });
  });
  await page.goto('/log');
  expect(requests).toBe(0);
  await page.locator('#open-search').click();
  await page.locator('#search-query').fill('quater');
  const result = page.locator(
    '#search-results a[href="/log/sealed-council-convenes"]',
  );
  await expect(result).toBeVisible();
  await expect(result).toHaveText('<script>Example</script>Repository note');
  await expect(result.locator('script')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.locator('#open-search').click();
  expect(requests).toBe(1);
});

test('Find retries failed index loads on reopening', async ({ page }) => {
  let requests = 0;
  await page.route('**/search-index.json', async (route) => {
    requests++;
    if (requests === 1)
      await route.fulfill({ status: 503, body: 'Unavailable' });
    else
      await route.fulfill({
        json: [
          {
            url: '/log/sealed-council-convenes',
            meta: { title: 'Recovered', description: 'Note' },
            searchText: 'recovered',
          },
        ],
      });
  });
  await page.goto('/log');
  await page.locator('#open-search').click();
  await expect(page.locator('#search-status')).toContainText('Reopen Find');
  await page.keyboard.press('Escape');
  await page.locator('#open-search').click();
  await page.locator('#search-query').fill('recover');
  await expect(page.locator('#search-results')).toContainText('Recovered');
});

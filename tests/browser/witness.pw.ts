import { required } from '../../src/portfolio/required';
import { expect, test } from '@playwright/test';
test('disabled witness stays readable without counting and stats survives revision selection', async ({
  page,
}) => {
  await page.goto('/log');
  const link = page
    .locator('a[href^="/log/"]')
    .filter({ hasText: /./ })
    .first();
  const href = required(await link.getAttribute('href'));
  expect(href).toBeTruthy();
  await page.goto(required(href));
  const stats = page.getByRole('link', { name: 'View statistics' });
  await expect(stats).toHaveAttribute('href', `${href}/verified#stats`);
  await stats.click();
  await expect(page.locator('section[aria-labelledby="stats"]')).toContainText(
    'Measurement disabled',
  );
  await expect(page.locator('#timestamps')).toBeAttached();
  await expect(page.locator('[data-witness-opt-in]')).toHaveCount(0);
});

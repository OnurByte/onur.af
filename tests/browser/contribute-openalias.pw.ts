import { expect, test } from '@playwright/test';

test('OpenAlias placeholder remains visible beside the contribution flow', async ({
  page,
}) => {
  await page.goto('/contribute');
  const section = page.getByRole('region', { name: 'OpenAlias' });
  await expect(section).toBeVisible();
  await expect(
    section.getByText('Not configured', { exact: true }),
  ).toBeVisible();
  await expect(section.getByRole('button', { name: 'Copy' })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Continue to payment' }),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

import { expect, test } from '@playwright/test';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`Subjects remain readable on mobile in ${colorScheme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ colorScheme });
    await page.goto('/log/cryptic-watchtower-watches');
    const subjects = page.getByRole('navigation', {
      name: 'Subjects',
      exact: true,
    });
    await expect(
      subjects.getByRole('link', { name: 'Development', exact: true }),
    ).toHaveAttribute('rel', 'tag');
    await subjects
      .getByRole('link', { name: 'Development', exact: true })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Development', exact: true }),
    ).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, follow',
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test('Find locates a subject by alias and retains known empty subject URLs', async ({
  page,
  request,
}) => {
  await page.goto('/log');
  await page.keyboard.press('Control+k');
  await page.locator('#search-query').fill('software engineering');
  await expect(
    page.locator('#search-results a[href="/log/tag/development"]'),
  ).toBeVisible();
  const response = await request.get('/log/tag/pgp');
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain(
    'No logs filed under this subject yet.',
  );
  expect((await request.get('/log/tag/unknown')).status()).toBe(404);
});

import { expect, test } from '@playwright/test';
for (const colorScheme of ['light', 'dark'] as const) {
  for (const width of [375, 1280]) {
    test(`Verified puts bordered statistics first at ${String(width)}px in ${colorScheme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme });
      await page.goto('/log/cryptic-watchtower-watches/verified?v=1');
      const heading = page.locator('main > header');
      await expect(heading.locator('h1')).toBeVisible();
      await expect(heading).toContainText(
        'Verify this revision with a fingerprint you trust.',
      );
      await expect(heading.locator('time')).toBeVisible();
      const order = await page.locator('main').evaluate((main) => {
        const header = main.querySelector('header');
        const stats = main.querySelector('[aria-labelledby="stats"]');
        return Boolean(
          header &&
          stats &&
          header.getBoundingClientRect().bottom <=
            stats.getBoundingClientRect().top,
        );
      });
      expect(order).toBe(true);
      const cards = page.locator('[data-verified-card]');
      await expect(cards.first()).toHaveAttribute('aria-labelledby', 'stats');
      await expect(cards).toHaveCount(4);
      for (const card of await cards.all()) {
        const style = await card.evaluate((el) => {
          const css = getComputedStyle(el);
          return {
            border: css.borderTopWidth,
            radius: css.borderTopLeftRadius,
          };
        });
        expect(style.border).toBe('1px');
        expect(style.radius).toBe('12px');
      }
      await expect(
        page.getByRole('navigation', { name: 'Signed revisions' }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `/tmp/onur-verified-${colorScheme}-${String(width)}.png`,
      });
    });
  }
}

test('the standalone witness page is removed and statistics explain views inline', async ({
  page,
  request,
}) => {
  expect((await request.get('/witness')).status()).toBe(404);
  await page.goto('/log/cryptic-watchtower-watches/verified');
  await expect(page.locator('a[href^="/witness"]')).toHaveCount(0);
  await expect(page.locator('section[aria-labelledby="stats"]')).toContainText(
    'Views estimate unique browsers per Log; published evidence lets you verify the recorded history.',
  );
});

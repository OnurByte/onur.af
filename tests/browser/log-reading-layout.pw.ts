import { expect, test } from '@playwright/test';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`${colorScheme} Log reading column has balanced side space`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto('/log/cryptic-watchtower-watches');
    for (const width of [320, 390, 620, 621, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const geometry = await page.locator('main').evaluate((main) => {
        const article = main.querySelector('article.h-entry');
        if (!article) throw new Error('Missing Log article');
        const outer = main.getBoundingClientRect();
        const inner = article.getBoundingClientRect();
        const css = getComputedStyle(main);
        return {
          left: inner.left - outer.left - parseFloat(css.paddingLeft),
          right: outer.right - parseFloat(css.paddingRight) - inner.right,
          width: inner.width,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(Math.abs(geometry.left - geometry.right)).toBeLessThanOrEqual(0.5);
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.width).toBeLessThanOrEqual(592);
      expect(geometry.overflow).toBe(false);
    }
  });
}

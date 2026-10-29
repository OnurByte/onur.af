import { expect, test } from '@playwright/test';

for (const colorScheme of ['light', 'dark'] as const) {
  for (const width of [375, 1280]) {
    test(`Verified label and seal share the cap-height center at ${String(width)}px in ${colorScheme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme });
      await page.goto('/');
      const badge = page
        .locator('a')
        .filter({
          has: page.locator('[data-icon="proof"]'),
          hasText: 'Verified',
        })
        .first();
      const geometry = await badge.evaluate((element) => {
        const label = element.querySelector('span');
        const icon = element.querySelector('[data-icon="proof"]');
        if (!label || !icon) throw new Error('Missing labeled proof');
        const text = label.getBoundingClientRect();
        const seal = icon.getBoundingClientRect();
        const css = getComputedStyle(label);
        return {
          labelHeight: text.height,
          fontSize: parseFloat(css.fontSize),
          textCenter: text.y + text.height / 2,
          sealCenter: seal.y + seal.height / 2,
          linkHeight: element.getBoundingClientRect().height,
        };
      });
      expect(geometry.labelHeight).toBeLessThan(geometry.fontSize);
      expect(geometry.textCenter).toBeCloseTo(geometry.sealCenter, 1);
      expect(geometry.linkHeight).toBe(24);
      await badge.screenshot({
        path: `/tmp/onur-proof-aligned-${colorScheme}-${String(width)}.png`,
      });
    });
  }
}

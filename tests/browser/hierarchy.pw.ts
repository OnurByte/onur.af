import { expect, test } from '@playwright/test';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`${colorScheme} source headings remain secondary and icons match their identity stack`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto('/');
    for (const width of [320, 620, 621, 900, 901, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const id of ['x', 'github']) {
        const section = page.locator(`[aria-labelledby="embed-${id}"]`);
        const metrics = await section.locator('header').evaluate((header) => {
          const heading = header.querySelector('h2');
          const identity = heading?.parentElement;
          const icon = header.querySelector('[data-icon]');
          if (!heading || !identity || !icon)
            throw new Error('Missing provider identity');
          const textBox = identity.getBoundingClientRect();
          const iconBox = icon.getBoundingClientRect();
          const css = getComputedStyle(heading);
          return {
            fontSize: css.fontSize,
            fontWeight: css.fontWeight,
            lineHeight: parseFloat(css.lineHeight),
            heightError: iconBox.height - textBox.height,
            centerError:
              iconBox.top +
              iconBox.height / 2 -
              (textBox.top + textBox.height / 2),
          };
        });
        expect.soft(metrics.fontSize).toBe('18px');
        expect.soft(metrics.fontWeight).toBe('400');
        expect.soft(metrics.lineHeight).toBeCloseTo(25.2, 1);
        expect.soft(Math.abs(metrics.heightError)).toBeLessThanOrEqual(0.1);
        expect.soft(Math.abs(metrics.centerError)).toBeLessThanOrEqual(0.1);
      }
      const primary = await page
        .locator('#connect-heading')
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      const secondary = await page
        .locator('#embed-x')
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
      expect.soft(primary).toBeGreaterThan(secondary);
      const x = await page.locator('[aria-labelledby="embed-x"]').boundingBox();
      const github = await page
        .locator('[aria-labelledby="embed-github"]')
        .boundingBox();
      if (!x || !github) throw new Error('Missing provider card geometry');
      if (width >= 901)
        expect.soft(github.x - x.x - x.width).toBeCloseTo(32, 1);
      await page.screenshot({
        path: `/tmp/onur-hierarchy-after-${colorScheme}-${String(width)}.png`,
        fullPage: true,
      });
    }
  });
}

for (const path of ['/', '/log', '/log/tag/development']) {
  test(`${path} Log card headings follow their containing section`, async ({
    page,
  }) => {
    await page.goto(path);
    const cards = page.locator('main .h-entry');
    expect(await cards.count()).toBeGreaterThan(0);
    await expect(
      cards.locator(path === '/' ? 'h3.p-name' : 'h2.p-name'),
    ).toHaveCount(await cards.count());
    if (path === '/') {
      const sizes = await page.locator('#recent-logs').evaluate((section) => {
        const parent = section.querySelector('h2');
        const child = section.querySelector('.p-name');
        if (!parent || !child) throw new Error('Missing Log headings');
        return {
          parent: parseFloat(getComputedStyle(parent).fontSize),
          child: parseFloat(getComputedStyle(child).fontSize),
        };
      });
      expect(sizes.child).toBeLessThan(sizes.parent);
    }
  });
}

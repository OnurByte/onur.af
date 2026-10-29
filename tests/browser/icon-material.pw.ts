import { expect, test } from '@playwright/test';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`icon depth scales with the rendered short side in ${colorScheme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    const icon = page.locator('[data-icon="onur"]').first();
    for (const [width, height] of [
      [16, 16],
      [24, 24],
      [32, 32],
      [56, 56],
      [64, 32],
    ] as const) {
      const material = await icon.evaluate(
        (element, size) => {
          if (!(element instanceof HTMLElement))
            throw new Error('Missing icon');
          const outer = element;
          outer.style.width = `${String(size[0])}px`;
          outer.style.height = `${String(size[1])}px`;
          const depth = outer.firstElementChild;
          const face = depth?.firstElementChild;
          if (!depth || !face) throw new Error('Missing icon material');
          return {
            filter: getComputedStyle(depth).filter,
            faceFilter: getComputedStyle(face).filter,
            mask: getComputedStyle(face).maskImage,
            gradient: getComputedStyle(face).backgroundImage,
            depthWidth: depth.getBoundingClientRect().width,
            depthHeight: depth.getBoundingClientRect().height,
          };
        },
        [width, height] as const,
      );
      const short = Math.min(width, height);
      const lengths = [...material.filter.matchAll(/(-?[\d.]+)px/g)].map(
        (match) => Number(match[1]),
      );
      expect(lengths).toHaveLength(3);
      expect(lengths[0]).toBeCloseTo(short * 0.02, 4);
      expect(lengths[1]).toBeCloseTo(short * 0.04, 4);
      expect(lengths[2]).toBeCloseTo(short * 0.005, 4);
      expect(material.faceFilter).toBe('none');
      expect(material.mask).toContain('/brand/onur.svg');
      expect(material.gradient).toContain('135deg');
      expect(material.depthWidth).toBe(width);
      expect(material.depthHeight).toBe(height);
    }
    await icon.evaluate((element) => {
      if (!(element instanceof HTMLElement)) throw new Error('Missing icon');
      element.style.removeProperty('width');
      element.style.removeProperty('height');
    });
    for (const width of [360, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const box = await icon.boundingBox();
      if (!box) throw new Error('Missing icon bounds');
      expect(box.width).toBe(width === 360 ? 48 : 56);
    }
    await icon.screenshot({
      path: `/tmp/onur-visible-depth-brand-${colorScheme}.png`,
    });
    await page
      .locator('[data-icon="proof"]')
      .first()
      .screenshot({
        path: `/tmp/onur-proof-${colorScheme}.png`,
      });
    const tech = page.locator('[data-icon^="tech"]').first();
    await tech.scrollIntoViewIfNeeded();
    await expect(tech.locator('[data-icon-source]')).toBeVisible();
    await expect(tech.locator('[data-icon-source]')).toHaveCSS(
      'mask-image',
      /url/,
    );
    await page.screenshot({
      path: `/tmp/portfolio-icons-${colorScheme}.png`,
      fullPage: true,
    });
    for (const media of [
      { contrast: 'more' as const },
      { contrast: 'no-preference' as const, forcedColors: 'active' as const },
    ]) {
      await page.emulateMedia(media);
      await expect(icon.locator(':scope > span')).toHaveCSS('filter', 'none');
      await expect(icon.locator(':scope > span > span').first()).toHaveCSS(
        'background-image',
        'none',
      );
    }
  });
}

test('technology masks remain visible without JavaScript', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:14323/');
  const fallback = page.locator('[data-icon^="tech"] noscript span').first();
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveCSS('mask-image', /url/);
  await context.close();
});

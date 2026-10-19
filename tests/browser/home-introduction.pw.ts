import { expect, test } from '@playwright/test';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`${colorScheme} introduction remains readable without JavaScript`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      colorScheme,
    });
    const page = await context.newPage();
    await page.goto('/');
    const card = page.locator('[aria-labelledby="introduction-heading"]');
    await expect(card.locator('h2')).toHaveText("I'm Onur.");
    await expect(card.locator('p')).toHaveText([
      'I build software and shape my own tools. I want to understand what runs on my machines, question the defaults, and change what gets in the way. Working on a tool is often how I learn to think more clearly about the problem it solves.',
      'I value independent thought and the responsibility that comes with making my own choices. That shapes what I build, what I use, and what I choose to share. This site is a record of that work and the ideas behind it.',
    ]);
    await expect(card.locator('img')).toHaveAttribute('alt', '');
    expect(
      await card
        .locator('img')
        .evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
    ).toBe(true);
    for (const width of [320, 375, 620, 621, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const bounds = await card.boundingBox();
      const image = await card.locator('img').boundingBox();
      const text = await card.locator('p').first().boundingBox();
      const heading = await card.locator('h2').boundingBox();
      expect(heading!.y - bounds!.y).toBeLessThan(30);
      expect(
        await card
          .locator('img')
          .evaluate((image) => getComputedStyle(image).filter),
      ).toBe('none');
      expect(image!.x).toBeGreaterThan(bounds!.x);
      expect(image!.x + image!.width).toBeLessThan(bounds!.x + bounds!.width);
      expect(image!.y + image!.height).toBeLessThan(bounds!.y + bounds!.height);
      if (width <= 620)
        expect(text!.y).toBeGreaterThanOrEqual(image!.y + image!.height);
      else expect(text!.x + text!.width).toBeLessThanOrEqual(image!.x);
      if (width === 375)
        await page.screenshot({
          path: `test-results/introduction-${colorScheme}-mobile.png`,
          fullPage: true,
        });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.setViewportSize({ width: 1280, height: 1100 });
    await page.screenshot({
      path: `test-results/introduction-${colorScheme}.png`,
      fullPage: true,
    });
    await context.close();
  });
}

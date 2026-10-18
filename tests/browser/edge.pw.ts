import { expect, test } from '@playwright/test';

test('surface borders keep both corner lights across responsive widths', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });

  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');

    for (const selector of ['#connect-x > div', '#spotify-embed']) {
      const frame = page.locator(selector);
      const style = await frame.evaluate((element) => {
        const computed = getComputedStyle(element);
        return {
          backgroundClip: computed.backgroundClip,
          backgroundImage: computed.backgroundImage,
          borderColor: computed.borderColor,
          width: element.clientWidth,
        };
      });

      expect(style.backgroundImage).toContain(
        'radial-gradient(50% 50% at 100% 0%',
      );
      expect(style.backgroundImage).toContain(
        'radial-gradient(50% 50% at 0% 100%',
      );
      expect(style.backgroundClip).toBe('padding-box, border-box, border-box');
      expect(style.borderColor).toBe('rgba(0, 0, 0, 0)');
      expect(style.width).toBeGreaterThan(0);
    }
  }
});

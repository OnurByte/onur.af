import { expect, test } from '@playwright/test';

for (const width of [375, 1280]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`modal switching preserves background scroll at ${width}px in ${colorScheme}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({
        colorScheme,
        reducedMotion: colorScheme === 'dark' ? 'reduce' : 'no-preference',
      });
      await page.goto('/log/cryptic-watchtower-watches');
      const share = page.getByRole('button', { name: 'Share log' });
      await share.click();
      const initialScroll = await page.evaluate(() => scrollY);
      const shareDialog = page.getByRole('dialog', { name: 'Share log' });
      const findDialog = page.getByRole('dialog', { name: 'Search pages' });
      for (const [step, dialog] of [
        shareDialog,
        findDialog,
        shareDialog,
      ].entries()) {
        await expect(dialog).toBeVisible();
        await page.mouse.move(5, 780);
        await page.mouse.wheel(0, 600);
        // Wheel scrolling is handled asynchronously by the browser compositor.
        await page.waitForTimeout(200);
        await page.screenshot({
          path: testInfo.outputPath(
            `modal-${step}-${await dialog.getAttribute('id')}.png`,
          ),
        });
        expect(await page.evaluate(() => scrollY)).toBe(initialScroll);
        if (step === 0) await page.keyboard.press('Control+k');
        if (step === 1) await page.keyboard.press('Control+Shift');
      }
      // Closing Share must restore focus and unlock the document again.
      await expect(shareDialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(shareDialog).not.toBeVisible();
      await expect(share).toBeFocused();
      await page.mouse.move(5, 780);
      await page.mouse.wheel(0, 600);
      await expect
        .poll(() => page.evaluate(() => scrollY))
        .toBeGreaterThan(initialScroll);
    });
  }
}

test('short Share dialog scrolls internally without moving the article', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 320 });
  await page.goto('/log/cryptic-watchtower-watches');
  await page.keyboard.press('Control+Shift');
  const dialog = page.getByRole('dialog', { name: 'Share log' });
  await expect(dialog).toBeVisible();
  const initialScroll = await page.evaluate(() => scrollY);
  await dialog.hover();
  await page.mouse.wheel(0, 300);
  await expect
    .poll(() =>
      dialog.locator('[data-dialog-scroll]').evaluate((node) => node.scrollTop),
    )
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(initialScroll);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Share log' })).toBeFocused();
});

for (const width of [375, 1280]) {
  for (const [chord, name] of [
    ['Control+Shift', 'Share log'],
    ['Control+k', 'Search pages'],
  ]) {
    test(`${name} keyboard opening stops active scroll at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.clock.install();
      await page.clock.pauseAt(new Date(Date.now() + 1000));
      await page.goto('/log/cryptic-watchtower-watches');
      const wheel = () =>
        page.evaluate(() =>
          document.body.dispatchEvent(
            new WheelEvent('wheel', {
              deltaY: 600,
              bubbles: true,
              cancelable: true,
            }),
          ),
        );
      await wheel();
      await page.clock.runFor(40);
      const moving = await page.evaluate(() => scrollY);
      expect(moving).toBeGreaterThan(0);
      expect(moving).toBeLessThan(600);
      await page.keyboard.press(chord!);
      const dialog = page.getByRole('dialog', { name: name! });
      await expect(dialog).toBeVisible();
      const stopped = await page.evaluate(() => scrollY);
      await page.clock.runFor(1000);
      expect(await page.evaluate(() => scrollY)).toBe(stopped);
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      const closed = await page.evaluate(() => scrollY);
      await wheel();
      await page.clock.runFor(1000);
      expect(await page.evaluate(() => scrollY)).toBeGreaterThan(closed);
    });
  }
}

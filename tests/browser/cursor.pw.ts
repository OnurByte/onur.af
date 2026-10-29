import { expect, test } from '@playwright/test';
import sharp from 'sharp';

test('ring follows mouse, expands on links and respects motion preference', async ({
  page,
}) => {
  await page.goto('/');
  const ring = page.locator('[data-cursor-ring]');
  await page.mouse.move(400, 150);
  await expect(ring).toHaveCSS('opacity', '1');
  await expect(ring).toHaveCSS('pointer-events', 'none');
  await expect(ring).toHaveCSS('width', '24px');
  await expect(page.locator('body')).toHaveCSS('cursor', 'none');
  await page.getByRole('link', { name: 'Onur home' }).hover();
  await expect(ring).toHaveCSS('width', '32px');
  await expect(page.getByRole('link', { name: 'Onur home' })).toHaveCSS(
    'cursor',
    'none',
  );
  await expect(ring).toHaveCSS('opacity', '1');
  await expect(ring).toHaveCSS('mix-blend-mode', 'difference');
  await expect(ring).toBeVisible();
  await page.screenshot({ path: '/tmp/onur-cursor-preview.png' });
  await page.mouse.wheel(0, 100);
  await expect(ring).toHaveCSS('opacity', '1');
  await expect(page.locator('body')).toHaveCSS('cursor', 'none');
  await page.keyboard.press('Tab');
  await expect(ring).toHaveCSS('opacity', '0');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.mouse.move(450, 150);
  await expect(page.locator('body')).toHaveCSS('cursor', 'none');
  await expect(ring).toHaveCSS('opacity', '1');
  await expect(ring).toHaveCSS('transition-duration', '0s');
});

test('touch input never shows the ring', async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:14323/');
  await page.touchscreen.tap(200, 200);
  await expect(page.locator('[data-cursor-ring]')).toHaveCSS('opacity', '0');
  await context.close();
});

test('text fields use an inverted caret and links use an inverted circle', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Find' }).click();
  const input = page.getByRole('searchbox', { name: 'Search pages' });
  await input.hover();
  await expect(page.locator('[data-cursor-ring]')).toHaveCSS('opacity', '1');
  await expect(page.locator('[data-cursor-ring]')).toHaveCSS('width', '4px');
  await expect(input).toHaveCSS('cursor', 'none');
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Onur home' }).hover();
  await expect(page.getByRole('link', { name: 'Onur home' })).toHaveCSS(
    'cursor',
    'none',
  );
  await expect(page.locator('[data-cursor-ring]')).toHaveCSS('opacity', '1');
});

test('press feedback and keyboard never expose the native pointer', async ({
  page,
}) => {
  await page.goto('/');
  const link = page.getByRole('button', { name: 'Find' });
  const ring = page.locator('[data-cursor-ring]');
  await link.hover();
  await page.mouse.down();
  await expect(ring).toHaveCSS('width', '28px');
  await page.mouse.move(400, 150);
  await expect(ring).toHaveCSS('width', '20px');
  await page.mouse.up();
  await expect(ring).toHaveCSS('width', '24px');
  await page.keyboard.press('Tab');
  await expect(page.locator('body')).toHaveCSS('cursor', /cursor\.svg/);
});

test('without JavaScript the pointer is still a custom circle', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:14323/');
  await expect(page.getByRole('link', { name: 'Onur home' })).toHaveCSS(
    'cursor',
    /cursor\.svg/,
  );
  await context.close();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`network icons keep opaque contrast under the cursor in ${colorScheme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    for (const name of ['TOR', 'I2P']) {
      const network = page.getByRole('img', { name, exact: true });
      await network.hover();
      await expect(network).toHaveCSS('opacity', '1');
      await expect(page.locator('[data-cursor-ring]')).toHaveCSS(
        'opacity',
        '1',
      );
      await expect(page.locator('[data-cursor-ring]')).toHaveCSS(
        'mix-blend-mode',
        'difference',
      );
    }
  });
}

test('cursor stays above the annotation popover', async ({ page }) => {
  await page.goto('/log/cryptic-watchtower-watches');
  const paragraph = page.locator('.log-body p').first();
  await paragraph.scrollIntoViewIfNeeded();
  await paragraph.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
  });
  await page
    .getByRole('button', { name: 'Annotate', exact: true })
    .first()
    .click();
  const form = page.locator('[data-annotation-form]').first();
  await form.locator('[name="note"]').hover();
  await expect(form.locator('[data-cursor-ring]')).toHaveCSS('opacity', '1');
  await expect(form.locator('[data-cursor-ring]')).toHaveCSS('width', '4px');
  await expect(
    form.getByRole('button', { name: 'Export annotation key' }),
  ).toBeHidden();
  await expect(form.locator('[name="note"]')).toHaveCSS(
    'font-family',
    await page
      .locator('body')
      .evaluate((element) => getComputedStyle(element).fontFamily),
  );
  await page.keyboard.press('Escape');
  await page.mouse.move(10, 300);
  await expect(page.locator('body > [data-cursor-ring]')).toHaveCSS(
    'opacity',
    '1',
  );
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`cursor inverts every selected-text pixel in ${colorScheme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/log/cryptic-watchtower-watches');
    const paragraph = page.locator('.log-body p').first();
    await paragraph.scrollIntoViewIfNeeded();
    await paragraph.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    });
    await expect(page.locator('html')).toHaveAttribute(
      'data-rounded-selection',
      '',
    );
    const box = await paragraph.boundingBox();
    if (!box) throw new Error('Missing selected text');
    const x = box.x + 200,
      y = box.y + 10;
    const clip = { x: x - 4, y: y - 4, width: 8, height: 8 };
    await page.mouse.move(5, 100);
    const before = await sharp(await page.screenshot({ clip }))
      .removeAlpha()
      .raw()
      .toBuffer();
    await page.mouse.move(x, y);
    await expect(page.locator('[data-cursor-ring]')).toHaveCSS(
      'background-color',
      'rgb(255, 255, 255)',
    );
    const after = await sharp(await page.screenshot({ clip }))
      .removeAlpha()
      .raw()
      .toBuffer();
    expect(after.length).toBe(before.length);
    for (let i = 0; i < before.length; i++) {
      expect(
        Math.abs((after[i] ?? 0) + (before[i] ?? 0) - 255),
      ).toBeLessThanOrEqual(2);
    }
  });
}

test('cursor inverts arbitrary surface colors channel by channel', async ({
  page,
}) => {
  await page.goto('/');
  for (const color of ['#000000', '#ffffff', '#2581d3', '#d65329', '#7a7a7a']) {
    await page.evaluate((background) => {
      let swatch = document.querySelector('[data-cursor-swatch]');
      if (!swatch) {
        swatch = document.createElement('div');
        swatch.setAttribute('data-cursor-swatch', '');
        document.body.append(swatch);
      }
      if (!(swatch instanceof HTMLElement)) throw new Error('Missing swatch');
      swatch.style.cssText = `position:fixed;left:300px;top:300px;width:80px;height:80px;background:${background};z-index:50`;
    }, color);
    const clip = { x: 336, y: 336, width: 8, height: 8 };
    await page.mouse.move(200, 200);
    const before = await sharp(await page.screenshot({ clip }))
      .removeAlpha()
      .raw()
      .toBuffer();
    await page.mouse.move(340, 340);
    const after = await sharp(await page.screenshot({ clip }))
      .removeAlpha()
      .raw()
      .toBuffer();
    expect(after.length).toBe(before.length);
    for (let i = 0; i < before.length; i++) {
      expect(
        Math.abs((after[i] ?? 0) + (before[i] ?? 0) - 255),
      ).toBeLessThanOrEqual(2);
    }
  }
});

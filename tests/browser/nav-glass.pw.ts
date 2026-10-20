import { expect, test } from '@playwright/test';

test('procedural glass preserves geometry and responds without moving controls', async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  // Advance the paused clock through first paint and deferred decorative setup.
  await page.clock.runFor(1200);
  const nav = page.locator('[data-nav-glass]');
  await expect(nav).toHaveAttribute('data-glass-state', 'refractive');
  await page.clock.runFor(100);
  const before = await nav.evaluate((element) => ({
    x: parseFloat(element.style.getPropertyValue('--glass-light-x')),
    rect: element.getBoundingClientRect().toJSON(),
    header: element.parentElement!.getBoundingClientRect().height,
    map: document.querySelector('feImage')!.getAttribute('href'),
  }));
  expect(before.header).toBe(104);
  const button = await page.locator('#open-search').boundingBox();
  const stationary = await nav.getAttribute('style');
  await page.mouse.move(before.rect['right'] - 1, before.rect['top'] + 20);
  expect(await nav.getAttribute('style')).toBe(stationary);
  const strength = Number(
    await page.locator('feDisplacementMap').getAttribute('scale'),
  );
  await page.evaluate(() => scrollTo(0, 600));
  await page.clock.runFor(100);
  expect(
    Number(await page.locator('feDisplacementMap').getAttribute('scale')),
  ).toBeGreaterThan(strength);
  expect(await page.locator('#open-search').boundingBox()).toEqual(button);
  expect(
    await nav.evaluate(
      (element) => getComputedStyle(element, '::before').backdropFilter,
    ),
  ).toContain('url(');
  await page.setViewportSize({ width: 320, height: 812 });
  await page.clock.runFor(100);
  expect(
    await nav.evaluate(
      (element) => element.parentElement!.getBoundingClientRect().height,
    ),
  ).toBe(96);
  await expect
    .poll(async () => {
      await page.clock.runFor(100);
      return page.locator('feImage').getAttribute('href');
    })
    .not.toBe(before.map);
  await page.locator('#open-search').click();
  await expect(
    page.getByRole('dialog', { name: 'Search pages' }),
  ).toBeVisible();
});

test('motion pauses for preferences and bfcache while contrast becomes opaque', async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.goto('/');
  // Advance the paused clock through first paint and deferred decorative setup.
  await page.clock.runFor(1200);
  const nav = page.locator('[data-nav-glass]');
  await expect(nav).toHaveAttribute('data-glass-state', 'refractive');
  await page.clock.runFor(100);
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent('pagehide', { persisted: true }),
    ),
  );
  const stopped = await nav.getAttribute('style');
  await page.clock.runFor(5000);
  expect(await nav.getAttribute('style')).toBe(stopped);
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: true }),
    ),
  );
  await expect
    .poll(async () => {
      await page.clock.runFor(1000);
      return nav.getAttribute('style');
    })
    .not.toBe(stopped);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(nav).toHaveAttribute('data-glass-state', 'static');
  const staticScale = await page
    .locator('feDisplacementMap')
    .getAttribute('scale');
  await page.clock.runFor(5000);
  expect(await page.locator('feDisplacementMap').getAttribute('scale')).toBe(
    staticScale,
  );
  await page.emulateMedia({ contrast: 'more' });
  await expect(nav).toHaveAttribute('data-glass-state', 'opaque');
  expect(
    await nav.evaluate(
      (element) => getComputedStyle(element, '::before').backdropFilter,
    ),
  ).toBe('none');
  await page.emulateMedia({
    contrast: 'no-preference',
    reducedMotion: 'no-preference',
  });
  await expect(nav).toHaveAttribute('data-glass-state', 'refractive');
  expect(
    await nav.evaluate(
      (element) => getComputedStyle(element, '::after').backgroundImage,
    ),
  ).not.toContain('data:image/png');
});

test('without JavaScript the navbar keeps its original readable glass and links', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(
    nav.getByRole('link', { name: 'Log', exact: true }),
  ).toHaveAttribute('href', '/log');
  expect(
    await nav.evaluate(
      (element) => getComputedStyle(element, '::before').backdropFilter,
    ),
  ).toContain('grayscale(1)');
  await context.close();
});

test('navbar controls use the Connect border and the brand links home', async ({
  page,
}) => {
  await page.goto('/');
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    const standard = await page.locator('#connect-x > div').evaluate((el) => ({
      image: getComputedStyle(el).backgroundImage,
      border: getComputedStyle(el).borderColor,
    }));
    for (const control of [
      page.locator('[data-nav-glass] > div > a[href="/log"]'),
    ]) {
      expect(
        await control
          .locator('i[aria-hidden]')
          .evaluate((el) => getComputedStyle(el).backgroundImage),
      ).toContain('radial-gradient');
      expect(
        await control
          .locator('i[aria-hidden]')
          .evaluate((el) => getComputedStyle(el).borderColor),
      ).toBe(standard.border);
    }
    const find = await page.locator('#open-search').evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        fill: style.backgroundColor,
        filter: style.backdropFilter,
        border: style.borderWidth,
      };
    });
    expect(find.fill).toContain('/ 0.38)');
    expect(find.filter).toContain('blur(6px)');
    expect(find.border).toBe('1px');
    const ring = page.locator('[data-nav-glass] > span[aria-hidden]');
    expect(
      await ring.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          widths: [
            style.borderTopWidth,
            style.borderRightWidth,
            style.borderBottomWidth,
            style.borderLeftWidth,
          ],
          mask: style.maskImage,
          background: style.backgroundImage.includes('radial-gradient'),
        };
      }),
    ).toEqual({
      widths: ['1px', '1px', '1px', '1px'],
      mask: 'none',
      background: true,
    });
    expect(
      await page
        .locator('[data-nav-glass]')
        .evaluate((el) => getComputedStyle(el, '::before').backdropFilter),
    ).toContain('blur(6px)');
  }
  await page.goto('/log');
  await page.getByRole('link', { name: 'Onur home' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('dense displacement maps preserve the flat surface on a 2x screen', async ({
  browser,
}) => {
  const context = await browser.newContext({
    deviceScaleFactor: 2,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await page.goto('/');
  const nav = page.locator('[data-nav-glass]');
  await expect(nav).toHaveAttribute('data-glass-state', 'refractive');
  const metrics = await nav.evaluate(async (element) => {
    const href = document.querySelector('feImage')!.getAttribute('href')!;
    const image = new Image();
    image.src = href;
    await image.decode();
    return {
      width: image.naturalWidth,
      expected: Math.round(element.getBoundingClientRect().width + 24) * 2,
      fit: getComputedStyle(element, '::after').backgroundSize,
      height: element.parentElement!.getBoundingClientRect().height,
    };
  });
  expect(metrics.width).toBe(metrics.expected);
  expect(metrics.fit).toBe('100% 100%');
  expect(metrics.height).toBe(104);
  await context.close();
});

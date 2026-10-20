import { expect, test } from '@playwright/test';

test('global rail exposes semantic home sections and keyboard navigation', async ({
  page,
}) => {
  await page.goto('/');
  const rail = page.locator('[data-scroll-rail]');
  await expect(rail).toBeVisible();
  await expect(page.locator('[data-log-contents]')).toHaveCount(0);
  const trigger = rail.locator('[data-scroll-track]');
  await trigger.focus();
  const panel = rail.getByRole('navigation', { name: 'Page sections' });
  await expect(panel).toBeVisible();
  await expect(
    panel.getByRole('link', { name: 'Technologies', exact: true }),
  ).toBeVisible();
  await expect(panel).not.toContainText('01');
  await panel.getByRole('link', { name: 'Technologies', exact: true }).click();
  await expect(page).toHaveURL(/#technologies-heading$/);
  await expect(page.locator('#technologies-heading')).toBeFocused();
  await trigger.focus();
  await page.keyboard.press('Escape');
  await expect(panel).not.toBeVisible();
});

test('thumb follows native scrolling and keyboard reaches document ends', async ({
  page,
}) => {
  await page.goto('/pgp');
  const scrollbar = page.getByRole('scrollbar', { name: /^Page scroll/ });
  await scrollbar.focus();
  await page.keyboard.press('End');
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.abs(
          scrollY - (document.documentElement.scrollHeight - innerHeight),
        ),
      ),
    )
    .toBeLessThanOrEqual(1);
  await expect(scrollbar).toHaveAttribute('aria-valuenow', '100');
  await page.keyboard.press('Home');
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(scrollbar).toHaveAttribute('aria-valuenow', '0');
});

test('native scrolling survives without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/pgp');
  await expect(page.locator('[data-scroll-rail]')).not.toBeVisible();
  // Firefox headless may force hidden system scrollbars even for scrollbar-width:auto.
  await expect(page.locator('html')).not.toHaveAttribute(
    'data-scroll-enhanced',
  );
  await page.evaluate(() => window.scrollTo(0, 500));
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await context.close();
});

for (const width of [320, 768, 1440]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`rail panel is reachable at ${width}px in ${colorScheme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto('/pgp');
      const rail = page.locator('[data-scroll-rail]');
      const trigger = rail.locator('[data-scroll-track]');
      const panel = rail.getByRole('navigation', { name: 'Page sections' });
      await rail.hover();
      await expect(panel).toBeVisible();
      const link = panel.getByRole('link', {
        name: 'Account ownership',
        exact: true,
      });
      await link.hover();
      await expect(panel).toBeVisible();
      const box = (await panel.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      await panel.getByRole('link', { name: 'Log', exact: true }).click();
      await expect(page).toHaveURL(/#log-title$/);
      await expect(page.locator('#log-title')).toBeFocused();
      await page.mouse.move(0, 0);
      await page.goBack();
      await expect(page).toHaveURL(/\/pgp$/);
      await page.mouse.move(0, 0);
      await expect(panel).not.toBeVisible();
      await trigger.focus();
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
      await expect(panel).not.toBeVisible();
      await page.emulateMedia({ contrast: 'more' });
      await trigger.press('Enter');
      const contrast = await page.evaluate(
        () => matchMedia('(prefers-contrast: more)').matches,
      );
      await expect(panel).toHaveAttribute(
        'data-glass-state',
        contrast ? 'opaque' : 'static',
      );
      if (contrast)
        expect(
          await panel.evaluate(
            (node) => getComputedStyle(node, '::before').backdropFilter,
          ),
        ).toBe('none');
    });
  }
}

test('track dragging follows document position and modal locks the background', async ({
  page,
}) => {
  await page.goto('/pgp');
  const track = page.getByRole('scrollbar', { name: /^Page scroll/ });
  const box = (await page.locator('[data-scroll-rail]').boundingBox())!;
  await page.mouse.move(box.x + 1, box.y + 8);
  await page.mouse.down();
  await page.mouse.move(box.x + 1, box.y + box.height - 1, {
    steps: 12,
  });
  await page.mouse.up();
  await expect(track).toHaveAttribute('aria-valuenow', '100');
  await page.locator('#open-search').click();
  await expect(page.locator('[data-scroll-rail]')).not.toBeVisible();
  const y = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, -500);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(y);
});

test('Log listing keeps a minimal scrollbar without card headings', async ({
  page,
}) => {
  await page.goto('/log');
  await expect(
    page.getByRole('scrollbar', { name: /^Page scroll/ }),
  ).toBeVisible();
  await expect(page.locator('[data-scroll-rail] nav')).toBeHidden();
  await expect(page.locator('[data-scroll-list] a')).toHaveCount(0);
  await expect(page.locator('[data-scroll-rail] button')).toHaveCount(0);
});

test('verified Log uses real proof headings and current article excludes archives', async ({
  page,
}) => {
  await page.goto('/log/cryptic-watchtower-watches/verified');
  await page.locator('[data-scroll-track]').focus();
  const links = page.locator('[data-scroll-list] a');
  await expect(links).toHaveText([
    'Signed Markdown',
    'Portable proof',
    'Markdown timestamp',
  ]);
  await links.last().click();
  await expect(page).toHaveURL(/#timestamps-heading$/);
  await expect(page.locator('#timestamps-heading')).toBeFocused();
  await page.goto('/log/cryptic-watchtower-watches');
  const expected = await page
    .locator('.e-content :is(h2,h3,h4,h5,h6)[id]')
    .count();
  await expect(page.locator('[data-scroll-list] a')).toHaveCount(expected + 1);
  await expect(page.locator('[data-scroll-list] a').last()).toHaveText(
    'Sources',
  );
});

test('dynamic sections refresh the panel and geometry without a second rail', async ({
  page,
}) => {
  await page.goto('/rss');
  await page.evaluate(() => {
    const heading = document.createElement('h2');
    heading.id = 'additional-section';
    heading.textContent = 'Additional section';
    heading.setAttribute('data-scroll-section', '');
    document.querySelector('main')!.append(heading);
  });
  await page.locator('[data-scroll-track]').focus();
  await expect(page.locator('[data-scroll-list] a').last()).toHaveText(
    'Additional section',
  );
  await page.locator('[data-scroll-list] a').last().click();
  await expect(page.locator('#additional-section')).toBeFocused();
  await expect(page.locator('[data-scroll-rail]')).toHaveCount(1);
});

test('unrelated live text updates preserve focused section links', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('[data-scroll-track]').focus();
  const link = page.locator('[data-scroll-list] a').first();
  await link.focus();
  const focused = link;
  await expect(focused).toBeFocused();
  await page.evaluate(async () => {
    const clock = document.createElement('span');
    document.querySelector('main')!.append(clock);
    for (let tick = 0; tick < 3; tick++) {
      clock.textContent = `0:0${tick}`;
      await new Promise(requestAnimationFrame);
    }
  });
  await expect(focused).toBeFocused();
});

test('Find has an internal custom scrollbar with native track hidden', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 420 });
  await page.goto('/');
  await page.locator('#open-search').click();
  const dialog = page.getByRole('dialog', { name: 'Search pages' });
  const scrollbar = dialog.getByRole('scrollbar', {
    name: 'Search results scroll',
  });
  await expect(scrollbar).toBeVisible();
  const viewport = dialog.locator('[data-dialog-scroll]');
  expect(
    await viewport.evaluate((node) => getComputedStyle(node).scrollbarWidth),
  ).toBe('none');
  await scrollbar.focus();
  await page.keyboard.press('End');
  await expect(scrollbar).toHaveAttribute('aria-valuenow', '100');
  expect(await viewport.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
});

test('compact teeth stay outside main content and glass uses a separate border', async ({
  page,
}) => {
  await page.goto('/');
  const rail = page.locator('[data-scroll-rail]');
  await expect(rail.locator('button')).toHaveCount(0);
  const box = (await rail.boundingBox())!;
  const main = (await page.locator('main').boundingBox())!;
  const padding = await page
    .locator('main')
    .evaluate((node) => parseFloat(getComputedStyle(node).paddingRight));
  expect(main.x + main.width - padding).toBeLessThanOrEqual(box.x);
  await rail.locator('[data-scroll-track]').focus();
  await expect(
    page.locator('[data-scroll-list] a', { hasText: 'Logs' }),
  ).toHaveText('Logs');
  await expect(page.locator('[data-scroll-list]')).not.toContainText(
    'Recent Logs',
  );
  const panel = rail.locator('nav');
  expect(
    await panel.evaluate((node) => getComputedStyle(node).backgroundImage),
  ).toBe('none');
  await expect(panel.locator('i[aria-hidden]')).toHaveCount(1);
});

test('active tooth grows and fills with section progress', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/log/cryptic-watchtower-watches');
  const first = page.locator('[data-scroll-rail] > span a').first();
  const positions = await page
    .locator('.e-content h2')
    .evaluateAll((nodes) =>
      nodes
        .slice(0, 2)
        .map((node) => node.getBoundingClientRect().top + scrollY - 160),
    );
  await page.evaluate(
    (y) => window.scrollTo(0, y),
    (positions[0]! + positions[1]!) / 2,
  );
  await expect(first).toHaveAttribute('aria-current', 'location');
  await expect
    .poll(() =>
      first.evaluate((node) =>
        parseFloat(node.style.getPropertyValue('--section-progress')),
      ),
    )
    .toBeGreaterThan(0.45);
  const tooth = first.locator('span');
  expect(
    await tooth.evaluate((node) => node.getBoundingClientRect().width),
  ).toBe(20);
  await page.evaluate((y) => window.scrollTo(0, y + 4), positions[1]!);
  await expect
    .poll(() =>
      first.evaluate((node) =>
        node.style.getPropertyValue('--section-progress'),
      ),
    )
    .toBe('1');
  expect(
    await tooth.evaluate((node) => node.getBoundingClientRect().width),
  ).toBe(12);
});

test('short viewport keeps the contents panel below the sticky header', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 320 });
  await page.goto('/pgp');
  await page.locator('[data-scroll-track]').focus();
  const first = page.locator('[data-scroll-list] a').first();
  const header = (await page.locator('body > header').boundingBox())!;
  const heading = (await first.boundingBox())!;
  expect(heading.y).toBeGreaterThanOrEqual(header.y + header.height);
  await first.click();
  await expect(page.locator('#account-ownership')).toBeFocused();
});

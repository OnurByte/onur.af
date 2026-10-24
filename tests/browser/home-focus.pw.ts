import { expect, test } from '@playwright/test';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`${colorScheme} landing preserves identity with compact secondary content without JavaScript`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      colorScheme,
      reducedMotion: 'reduce',
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto('/');
    await expect(
      page.locator('[aria-labelledby="introduction-heading"]'),
    ).toContainText("Privacy isn't secrecy");
    await expect(page.locator('#recent-logs .h-entry').first()).toBeVisible();
    const technologies = page.locator(
      '[aria-labelledby="technologies-heading"]',
    );
    const connect = page.locator('[aria-labelledby="connect-heading"]');
    const technologyBox = await technologies.boundingBox();
    const connectBox = await connect.boundingBox();
    expect(technologyBox).not.toBeNull();
    expect(connectBox).not.toBeNull();
    if (!technologyBox || !connectBox) throw new Error('Missing home sections');
    expect(connectBox.y + connectBox.height).toBeLessThanOrEqual(
      technologyBox.y,
    );
    // A tool catalogue must not consume multiple screens before the visitor can continue.
    expect(technologyBox.height).toBeLessThan(844);
    for (const name of [
      'JavaScript',
      'Rust',
      'Astro',
      'NixOS',
      'Neovim',
      'Bun',
      'Libadwaita',
      'PostgreSQL',
      'MCP',
    ]) {
      await expect(technologies).toContainText(name);
    }
    for (const id of ['x', 'github']) {
      const section = page.locator(`[aria-labelledby="embed-${id}"]`);
      const rows = section.locator('li');
      const count = await rows.count();
      const details = section.locator('details');
      if (count > 2) {
        await expect(details).not.toHaveAttribute('open');
        await expect(rows.nth(2)).toBeHidden();
        await expect(rows.nth(0)).toBeVisible();
        const hrefs = await rows
          .locator('a')
          .evaluateAll((links) =>
            links.map((link) => link.getAttribute('href')),
          );
        const summary = details.locator('summary');
        await summary.focus();
        await summary.press('Enter');
        await expect(rows.nth(count - 1)).toBeVisible();
        expect(
          await rows
            .locator('a')
            .evaluateAll((links) =>
              links.map((link) => link.getAttribute('href')),
            ),
        ).toEqual(hrefs);
        await summary.press('Space');
        await expect(rows.nth(2)).toBeHidden();
      } else {
        await expect(details).toHaveCount(0);
      }
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await context.close();
  });
}

import { expect, test } from '@playwright/test';

test('all copy actions confirm only after copying the correct value', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  for (const action of [
    { path: '/pgp', button: '#copy-fingerprint', target: '#fingerprint-value' },
    { path: '/pgp', button: '#copy-key', target: '#public-key' },
    { path: '/rss', button: '#copy-feed', target: '#feed-address' },
    {
      path: '/donate/00000000-0000-4000-8000-000000000000',
      button: '[data-copy="amount"]',
      target: '#amount',
    },
    {
      path: '/donate/00000000-0000-4000-8000-000000000000',
      button: '[data-copy="address"]',
      target: '#address',
    },
  ]) {
    await page.goto(action.path);
    const value = await page
      .locator(action.target)
      .evaluate((element) =>
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement
          ? element.value
          : element.textContent!.trim(),
      );
    await page.locator(action.button).click();
    await expect(page.locator(action.button)).toHaveText('Copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      value,
    );
  }
});

test('PGP reports a clipboard failure without claiming it copied', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.clipboard, 'writeText', {
      value: async () => {
        throw new Error('Denied');
      },
    });
  });
  await page.goto('/pgp');
  await page.locator('#copy-key').click();
  await expect(page.locator('#copy-key')).toHaveText('Copy failed');
  await expect(page.locator('#key-copy-status')).toContainText('Copy failed');
});

for (const width of [320, 1280]) {
  test(`${width}px download feedback preserves a readable, separate key column`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/pgp');
    await page.locator('#copy-key').click();
    await expect(page.locator('#copy-key')).toHaveText('Copied');
    const download = page.waitForEvent('download');
    await page.locator('a[download]').click();
    expect((await download).suggestedFilename()).toBe('pgp.asc');
    await expect(page.locator('a[download]')).toHaveText('Downloading');
    await expect
      .poll(() =>
        page.locator('#public-key').evaluate((key) => {
          const bounds = key.getBoundingClientRect();
          const actions = document
            .querySelector('#key-actions')!
            .getBoundingClientRect();
          return (
            key.scrollHeight <= key.clientHeight &&
            actions.left >= bounds.right + 11.5
          );
        }),
      )
      .toBe(true);
    if (width === 1280) {
      await page.screenshot({
        path: '/tmp/portfolio-action-feedback.png',
        fullPage: true,
      });
    }
    await expect(page.locator('a[download]')).toHaveText('Download');
  });
}

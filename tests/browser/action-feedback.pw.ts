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
    const button = page.locator(action.button);
    const before = await button.boundingBox();
    await button.click();
    await expect(button).toHaveText('Copied');
    const after = await button.boundingBox();
    expect(after!.width).toBe(before!.width);
    expect(after!.height).toBe(before!.height);
    expect(after!.x).toBe(before!.x);
    expect(after!.y).toBe(before!.y);
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
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/pgp');
  const button = page.locator('#copy-key');
  const key = page.locator('#public-key');
  const keyWidth = (await key.boundingBox())!.width;
  expect(keyWidth).toBeGreaterThanOrEqual(176);
  const before = await button.boundingBox();
  await button.click();
  await expect(button).toHaveText('Copy failed');
  const after = await button.boundingBox();
  expect(after!.width).toBe(before!.width);
  expect(after!.height).toBe(before!.height);
  expect(after!.x).toBe(before!.x);
  expect(after!.y).toBe(before!.y);
  expect((await key.boundingBox())!.width).toBe(keyWidth);
  const labelMetrics = await button.evaluate((element) => {
    const style = getComputedStyle(element);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    context.font = style.font;
    const available =
      element.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);
    return {
      text: context.measureText(element.textContent ?? '').width,
      available,
      font: style.font,
      fontSize: style.fontSize,
      box: element.clientWidth,
      padding: [style.paddingLeft, style.paddingRight],
    };
  });
  expect(labelMetrics.text, JSON.stringify(labelMetrics)).toBeLessThanOrEqual(
    labelMetrics.available,
  );
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
    await page.locator('#key-actions a[download][href="/pgp.asc"]').click();
    expect((await download).suggestedFilename()).toBe('pgp.asc');
    await expect(
      page.locator('#key-actions a[download][href="/pgp.asc"]'),
    ).toHaveText('Downloading');
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
    await expect(
      page.locator('#key-actions a[download][href="/pgp.asc"]'),
    ).toHaveText('Download');
  });
}

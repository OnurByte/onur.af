import { expect, test } from '@playwright/test';

test('site blocks native copy everywhere while the PGP copy button still works', async ({
  page,
  context,
}) => {
  const messages: string[] = [];
  page.on('console', (message) => messages.push(message.text()));
  const response = await page.goto('/');
  const html = await response!.text();
  expect(html).toMatch(/<!--[\s\S]*VENI VIDI VICI[\s\S]*?-->/);
  await expect
    .poll(() => messages.some((message) => message.includes('VENI VIDI VICI')))
    .toBe(true);
  await expect(page.locator('a[href="#content"]')).toHaveCount(0);
  expect(
    await page
      .locator('main h1')
      .evaluate((element) => getComputedStyle(element).userSelect),
  ).toBe('none');
  expect(
    await page
      .locator('main h1')
      .evaluate((element) =>
        element.dispatchEvent(
          new ClipboardEvent('copy', { bubbles: true, cancelable: true }),
        ),
      ),
  ).toBe(false);
  expect(
    await page
      .locator('main h1')
      .evaluate((element) =>
        element.dispatchEvent(
          new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
        ),
      ),
  ).toBe(false);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/pgp');
  const key = page.locator('#public-key');
  for (const width of [320, 375, 1280, 320]) {
    await page.setViewportSize({ width, height: 640 });
    await expect
      .poll(() =>
        key.evaluate((element) => element.scrollHeight <= element.clientHeight),
      )
      .toBe(true);
    expect(
      await key.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
  }
  expect(
    await key.evaluate((element) => getComputedStyle(element).userSelect),
  ).toBe('none');
  const actions = page.locator('#key-actions');
  await expect(actions.getByRole('button', { name: 'Copy' })).toBeVisible();
  await expect(actions.getByRole('link', { name: 'Download' })).toHaveAttribute(
    'href',
    '/pgp.asc',
  );
  await expect(actions.getByRole('link', { name: 'Download' })).toHaveAttribute(
    'download',
    '',
  );
  const fingerprint = '3356 36C1 5D02 326F 9A43 1C98 4103 A3DD C441 9B61';
  await expect(page.locator('#fingerprint-field')).toBeVisible();
  await expect(page.locator('#fingerprint-value')).toHaveAttribute(
    'readonly',
    '',
  );
  await page
    .locator('#fingerprint-actions')
    .getByRole('button', { name: 'Copy' })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    fingerprint,
  );
  await key.focus();
  expect(
    await key.evaluate((element) =>
      element.dispatchEvent(
        new ClipboardEvent('copy', { bubbles: true, cancelable: true }),
      ),
    ),
  ).toBe(false);
  expect(
    await key.evaluate((element) =>
      element.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      ),
    ),
  ).toBe(false);
  await page.locator('#copy-key').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    await key.inputValue(),
  );
});

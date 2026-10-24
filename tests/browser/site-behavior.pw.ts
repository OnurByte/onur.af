import { readFile } from 'node:fs/promises';
import { readKey } from 'openpgp';
import { expect, test } from '@playwright/test';

test('native selection, copy and context menus remain available alongside Copy buttons', async ({
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
  ).not.toBe('none');
  expect(
    await page
      .locator('main h1')
      .evaluate((element) =>
        element.dispatchEvent(
          new ClipboardEvent('copy', { bubbles: true, cancelable: true }),
        ),
      ),
  ).toBe(true);
  expect(
    await page
      .locator('main h1')
      .evaluate((element) =>
        element.dispatchEvent(
          new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
        ),
      ),
  ).toBe(true);
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
  ).not.toBe('none');
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
  const fingerprint = (
    await readKey({ armoredKey: await readFile('public/pgp.asc', 'utf8') })
  )
    .getFingerprint()
    .toUpperCase()
    .match(/.{1,4}/g)!
    .join(' ');
  await expect(page.locator('#fingerprint-field')).toBeVisible();
  await expect(page.locator('#fingerprint-value')).toHaveAttribute(
    'readonly',
    '',
  );
  expect(
    await page.locator('#fingerprint-actions button').evaluate((button) => {
      const field = document
        .querySelector('#fingerprint-field')!
        .getBoundingClientRect();
      const bounds = button.getBoundingClientRect();
      return bounds.top >= field.top && bounds.bottom <= field.bottom;
    }),
  ).toBe(true);
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
  ).toBe(true);
  expect(
    await key.evaluate((element) =>
      element.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      ),
    ),
  ).toBe(true);
  await page.locator('#copy-key').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    await key.inputValue(),
  );
});

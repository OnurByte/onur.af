import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('PGP lists signed Log entries directly and remains usable on mobile', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/pgp');
  for (const id of ['x', 'github', 'log']) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }
  await expect(
    page.getByText(/no verification performed|illustrative layout|unverified/i),
  ).toHaveCount(0);
  const log = page.locator('#log');
  await expect(
    log.getByRole('heading', { name: 'Log', exact: true }),
  ).toBeVisible();
  const signedEntry = log.getByRole('link', {
    name: 'Example: copying embed snippets',
    exact: true,
  });
  await expect(signedEntry).toHaveAttribute(
    'href',
    '/pgp/log/sealed-lodge-waits',
  );
  expect((await request.get('/pgp/log')).status()).toBe(404);
  await signedEntry.click();
  await expect(page).toHaveURL('/pgp/log/sealed-lodge-waits');
  await expect(
    page.getByRole('textbox', { name: 'PGP signature' }),
  ).toBeVisible();
  await page.goto('/pgp');
  await expect(page.locator('#log')).toBeVisible();
  await page
    .locator('header nav')
    .getByRole('link', { name: 'Log', exact: true })
    .click();
  await expect(page).toHaveURL('/log');
  await expect(
    page.getByRole('heading', { name: 'Log', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  for (const path of [
    '/proofs/missing-v1.md',
    '/proofs/missing-v1.md.asc',
    '/pgp/unknown.asc',
  ]) {
    expect((await request.get(path)).status()).toBe(404);
  }
});

test('X and GitHub always show their PGP tick beside the account, including before signing', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  for (const path of ['/', '/pgp', '/pgp/x', '/pgp/github']) {
    await page.goto(path);
    const accounts =
      path === '/pgp/x'
        ? ['x']
        : path === '/pgp/github'
          ? ['github']
          : ['x', 'github'];
    for (const account of accounts) {
      const badge = page.getByRole('link', {
        name:
          account === 'x'
            ? 'X identity PGP proof'
            : 'GitHub identity PGP proof',
        exact: true,
      });
      await expect(badge).toBeVisible();
      await expect(badge).toHaveAttribute('href', `/pgp/${account}`);
      const previous = badge.locator('..').locator('a').first();
      await expect(previous).toHaveAttribute('href', `/pgp/${account}`);
      const textBox = await previous.boundingBox();
      const badgeBox = await badge.boundingBox();
      expect(badgeBox!.x).toBeGreaterThanOrEqual(textBox!.x + textBox!.width);
      expect(
        Math.abs(
          badgeBox!.y + badgeBox!.height / 2 - textBox!.y - textBox!.height / 2,
        ),
      ).toBeLessThan(3);
    }
  }
});

test('Log sits to the left of Find in the shared navbar and is absent from home content', async ({
  page,
}) => {
  for (const width of [320, 375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const find = page.locator('header #open-search');
    const log = page
      .locator('header nav')
      .getByRole('link', { name: 'Log', exact: true });
    await expect(log).toBeVisible();
    await expect(page.locator('main a[href="/log"]')).toHaveCount(0);
    const findBox = await find.boundingBox();
    const logBox = await log.boundingBox();
    expect(logBox!.x + logBox!.width).toBeLessThan(findBox!.x);
    expect(
      Math.abs(
        logBox!.y + logBox!.height / 2 - findBox!.y - findBox!.height / 2,
      ),
    ).toBeLessThan(2);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page
    .locator('header nav')
    .getByRole('link', { name: 'Log', exact: true })
    .click();
  await expect(page).toHaveURL('/log');
});

test('profile names open their PGP page and display the verified signature description', async ({
  page,
}) => {
  for (const account of ['x', 'github']) {
    await page.goto('/');
    const badge = page.getByRole('link', {
      name:
        account === 'x' ? 'X identity PGP proof' : 'GitHub identity PGP proof',
      exact: true,
    });
    await badge.locator('..').locator('a').first().click();
    await expect(page).toHaveURL(`/pgp/${account}`);
    await expect(page.locator('[data-page-description]')).toHaveText(
      'Verified by PGP.',
    );
    await expect(
      page.getByRole('textbox', { name: 'PGP signed URL' }),
    ).toBeVisible();
  }
});

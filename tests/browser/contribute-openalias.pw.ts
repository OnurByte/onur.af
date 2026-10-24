import { expect, test, type APIResponse } from '@playwright/test';

test('the contribution form sends a same-origin Origin header and reaches checkout', async ({
  page,
}) => {
  const post = page.waitForRequest(
    (request) =>
      request.method() === 'POST' &&
      new URL(request.url()).pathname === '/contribute/create',
  );
  await page.goto('/contribute?retry=00000000-0000-4000-8000-000000000000');
  await page.getByRole('button', { name: /Continue to payment/ }).click();
  const request = await post;
  expect(request.headers()['origin']).toBe('http://127.0.0.1:14323');
  expect(request.postData()).toContain(
    'id=00000000-0000-4000-8000-000000000000',
  );
  await expect(page).toHaveURL(
    '/contribute/00000000-0000-4000-8000-000000000000',
  );
});

test('OpenAlias placeholder remains visible beside the contribution flow', async ({
  page,
}) => {
  await page.goto('/contribute');
  const section = page.getByRole('region', { name: 'OpenAlias' });
  await expect(section).toBeVisible();
  await expect(
    section.getByText('Not configured', { exact: true }),
  ).toBeVisible();
  await expect(section.getByRole('button', { name: 'Copy' })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Continue to payment' }),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('removed donation aliases return 404 instead of forwarding to contributions', async ({
  request,
}) => {
  for (const path of [
    '/donate',
    '/donate/00000000-0000-4000-8000-000000000000',
  ]) {
    const response: APIResponse = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    expect(response.headers()['location']).toBeUndefined();
  }
  const response: APIResponse = await request.post('/donate/create', {
    headers: { origin: 'http://127.0.0.1:14323' },
    form: { id: '00000000-0000-4000-8000-000000000000', amount: '0.05' },
    maxRedirects: 0,
  });
  expect(response.status()).toBe(404);
  expect(response.headers()['location']).toBeUndefined();
});

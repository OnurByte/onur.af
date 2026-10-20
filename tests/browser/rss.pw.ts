import { expect, test } from '@playwright/test';
import artifact from '../../src/content/rss-signature.json' with { type: 'json' };
import { rssEntries } from '../../src/portfolio/rss-entries';

test('RSS page lists feed entries and links the existing PGP page', async ({
  page,
  request,
}) => {
  await page.goto('/rss');
  await expect(
    page.getByRole('heading', { name: 'Logs', exact: true }),
  ).toBeVisible();
  await expect(page.locator('[data-rss-entry]')).toHaveCount(rssEntries.length);
  if (rssEntries.length === 0)
    await expect(
      page.getByText('No logs published yet.', { exact: true }),
    ).toBeVisible();
  for (const entry of rssEntries) {
    await expect(
      page.getByRole('link', { name: entry.title, exact: true }),
    ).toHaveAttribute('href', entry.url);
  }
  await page.getByRole('link', { name: 'PGP key', exact: true }).click();
  await expect(page).toHaveURL('/pgp');
  const alias = await request.get('/rss', {
    headers: { Accept: 'application/rss+xml' },
  });
  const xml = await request.get('/rss.xml');
  expect(alias.status()).toBe(artifact === null ? 200 : 503);
  expect(await alias.text()).toBe(await xml.text());
});

test('local preview never advertises a missing or mismatched production signature', async ({
  page,
  request,
}) => {
  await page.goto('/rss');
  await expect(
    page.getByText(
      artifact === null
        ? 'This feed is not signed yet.'
        : 'Feed publication is paused until its signature is refreshed.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Signature', exact: true }),
  ).toHaveCount(0);
  const signature = await request.get('/rss.xml.asc');
  expect(signature.status()).toBe(artifact === null ? 404 : 503);
  expect(await signature.text()).not.toContain('BEGIN PGP SIGNATURE');
});

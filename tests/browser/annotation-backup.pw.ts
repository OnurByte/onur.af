import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { savedKeysSchema } from '../../src/portfolio/annotations/management';

test('encrypted annotation identity can be restored in a new browser context', async ({
  page,
  browser,
}) => {
  async function openIdentity(current: typeof page) {
    await current.goto('/log/cryptic-watchtower-watches');
    await current
      .locator('.log-body p')
      .first()
      .evaluate((paragraph) => {
        const range = document.createRange();
        range.selectNodeContents(paragraph);
        getSelection()?.removeAllRanges();
        getSelection()?.addRange(range);
      });
    await current
      .getByRole('button', { name: 'Annotate', exact: true })
      .first()
      .click();
    await current
      .getByText('Annotation identity', { exact: true })
      .first()
      .click();
  }
  await openIdentity(page);
  await page
    .getByLabel('Recovery passphrase', { exact: true })
    .first()
    .fill('cross device recovery passphrase');
  const downloaded = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download encrypted backup', exact: true })
    .first()
    .click();
  const download = await downloaded;
  const path = await download.path();
  expect(path).not.toBeNull();
  const backup = await readFile(path, 'utf8');
  const original = savedKeysSchema.parse(
    JSON.parse(
      await page.evaluate(
        () => localStorage.getItem('annotation-key-v1') ?? 'null',
      ),
    ),
  );
  expect(backup).not.toContain(original.privateKey.d);
  const context = await browser.newContext();
  try {
    const fresh = await context.newPage();
    await openIdentity(fresh);
    await fresh
      .getByLabel('Recovery passphrase', { exact: true })
      .first()
      .fill('wrong recovery passphrase');
    await fresh.getByLabel('Encrypted backup file').first().setInputFiles(path);
    await fresh
      .getByRole('button', { name: 'Restore encrypted backup', exact: true })
      .first()
      .click();
    await expect(
      fresh.locator('[data-annotation-backup-status]').first(),
    ).toHaveText(
      'Could not restore this backup. Check the file and recovery passphrase.',
    );
    expect(
      await fresh.evaluate(() => localStorage.getItem('annotation-key-v1')),
    ).toBeNull();
    await fresh
      .getByLabel('Recovery passphrase', { exact: true })
      .first()
      .fill('cross device recovery passphrase');
    await fresh
      .getByRole('button', { name: 'Restore encrypted backup', exact: true })
      .first()
      .click();
    await expect(
      fresh.locator('[data-annotation-backup-status]').first(),
    ).toHaveText('Annotation identity restored on this device.');
    const restored = savedKeysSchema.parse(
      JSON.parse(
        await fresh.evaluate(
          () => localStorage.getItem('annotation-key-v1') ?? 'null',
        ),
      ),
    );
    expect(restored.publicKey).toBe(original.publicKey);
  } finally {
    await context.close();
  }
});

import { expect, test } from '@playwright/test';
import {
  introduction,
  introductionEntry,
} from '../../src/portfolio/introduction';
import { logProofUrl, logRevisionUrl } from '../../src/portfolio/log';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`${colorScheme} introduction remains readable without JavaScript`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      colorScheme,
    });
    const page = await context.newPage();
    await page.goto('/');
    const card = page.locator('[aria-labelledby="introduction-heading"]');
    await expect(card.locator('h2')).toHaveText(introduction.heading);
    await expect(card.locator('p')).toHaveText(introduction.paragraphs);
    await expect(
      card.getByRole('link', { name: 'Publication PGP proof' }),
    ).toHaveText('Verified');
    await expect(
      card.locator('img[src="/brand/home-identity-portrait.svg"]'),
    ).toHaveAttribute('alt', '');
    expect(
      await card
        .locator('img[src="/brand/home-identity-portrait.svg"]')
        .evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
    ).toBe(true);
    for (const width of [320, 375, 620, 621, 768, 1280, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      const bounds = await card.boundingBox();
      const image = await card
        .locator('img[src="/brand/home-identity-portrait.svg"]')
        .boundingBox();
      const text = await card.locator('p').first().boundingBox();
      const heading = await card.locator('h2').boundingBox();
      expect(heading!.y - bounds!.y).toBeLessThan(30);
      expect(
        await card
          .locator('img[src="/brand/home-identity-portrait.svg"]')
          .evaluate((image) => getComputedStyle(image).filter),
      ).toBe('none');
      expect(image!.x).toBeGreaterThan(bounds!.x);
      expect(image!.x + image!.width).toBeLessThan(bounds!.x + bounds!.width);
      expect(image!.y + image!.height).toBeLessThan(bounds!.y + bounds!.height);
      if (width <= 620)
        expect(text!.y).toBeGreaterThanOrEqual(image!.y + image!.height);
      else expect(text!.x + text!.width).toBeLessThanOrEqual(image!.x);
      if (width === 375)
        await page.screenshot({
          path: `test-results/introduction-${colorScheme}-mobile.png`,
          fullPage: true,
        });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.setViewportSize({ width: 1280, height: 1100 });
    await page.screenshot({
      path: `test-results/introduction-${colorScheme}.png`,
      fullPage: true,
    });
    await card.getByRole('link', { name: 'Publication PGP proof' }).click();
    await expect(page).toHaveURL(logProofUrl(introductionEntry));
    await expect(page.locator('h1')).toHaveText(introduction.heading);
    await expect(
      page.getByRole('textbox', { name: 'PGP signature' }),
    ).toHaveValue(/-----BEGIN PGP SIGNATURE-----/);
    const file = logRevisionUrl(
      introductionEntry,
      introductionEntry.revisions.at(-1)!.version,
    );
    const text = await page.request.get(file);
    expect(text.ok()).toBe(true);
    expect(await text.text()).toContain(introduction.paragraphs[0]!);
    const signature = await page.request.get(`${file}.asc`);
    expect(signature.ok()).toBe(true);
    expect(await signature.text()).toContain('-----BEGIN PGP SIGNATURE-----');
    await expect(
      page.getByRole('heading', { name: 'Portable proof', exact: true }),
    ).toBeVisible();
    const timestamps = page.getByRole('region', {
      name: 'Markdown timestamp',
      exact: true,
    });
    await expect(
      timestamps.getByRole('link', {
        name: 'OpenTimestamps receipt',
        exact: true,
      }),
    ).toHaveAttribute('href', `${file}.ots`);
    const receipt = await page.request.get(`${file}.ots`);
    expect(receipt.ok()).toBe(true);
    expect((await receipt.body()).byteLength).toBeGreaterThan(0);
    await expect(
      page.getByRole('link', { name: 'Download archive', exact: true }),
    ).toHaveAttribute('href', `/log/${introductionEntry.id}/archive.tar`);
    await page.goto('/log');
    await expect(
      page.locator(`main a[href="/log/${introductionEntry.id}"]`),
    ).toHaveCount(0);
    const searchIndex = await page.request.get('/search-index.json');
    expect(await searchIndex.text()).not.toContain(introductionEntry.id);
    await page.goto(`/log/${introductionEntry.id}`);
    await expect(page.locator('h1')).toContainText(introduction.heading);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, follow',
    );
    await context.close();
  });
}

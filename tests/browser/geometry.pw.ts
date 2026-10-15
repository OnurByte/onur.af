import { expect, test } from '@playwright/test';

const paths = [
  '/',
  '/rss',
  '/pgp',
  '/donate',
  '/404',
  ...Array.from(
    { length: 6 },
    (_, index) => `/donate/00000000-0000-4000-8000-00000000000${index}`,
  ),
];

for (const colorScheme of ['light', 'dark'] as const) {
  for (const width of [320, 375, 620, 621, 768, 1280, 1440]) {
    test(`${colorScheme} ${width}px page geometry`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      for (const path of paths) {
        await page.goto(path);
        await expect(page.locator('main')).toBeVisible();
        const geometry = await page.evaluate(() => {
          const box = (selector: string) => {
            const rect = document
              .querySelector(selector)!
              .getBoundingClientRect();
            return { left: rect.left, right: rect.right, width: rect.width };
          };
          const main = box('main');
          return {
            header: box('header'),
            footer: box('footer'),
            main,
            heading: box('main h1'),
            scrollWidth: document.documentElement.scrollWidth,
            controls: [
              ...document.querySelectorAll(
                'footer a, main button, main input:not([type="hidden"]):not([type="radio"]), main textarea, main [data-payment-qr]',
              ),
            ]
              .filter((element) => element.getClientRects().length > 0)
              .map((element) => {
                const rect = element.getBoundingClientRect();
                return {
                  left: rect.left,
                  right: rect.right,
                  height: rect.height,
                };
              }),
          };
        });
        if (path === '/donate') {
          const custom = await page
            .locator('main form label')
            .last()
            .boundingBox();
          const submit = await page
            .locator('main form button[type="submit"]')
            .boundingBox();
          expect(
            submit!.y - (custom!.y + custom!.height),
          ).toBeGreaterThanOrEqual(24);
        }
        if (width > 620 && /000[234]$/.test(path)) {
          const payment = await page.locator('#address').evaluate((address) => {
            const detail = address.parentElement!.getBoundingClientRect();
            const grid =
              address.parentElement!.parentElement!.getBoundingClientRect();
            return { detailWidth: detail.width, gridWidth: grid.width };
          });
          expect(payment.detailWidth).toBeCloseTo(payment.gridWidth, 1);
        }
        const brand = await page
          .locator('header nav > :first-child')
          .boundingBox();
        const find = await page.locator('#open-search').boundingBox();
        expect(brand!.x).toBeCloseTo(geometry.header.left, 1);
        expect(brand!.y + brand!.height / 2).toBeCloseTo(
          find!.y + find!.height / 2,
          1,
        );
        if (
          path === '/donate' &&
          colorScheme === 'light' &&
          [320, 1280].includes(width)
        ) {
          await page.screenshot({
            path: `/tmp/portfolio-geometry-donate-${width}.png`,
            fullPage: true,
          });
        }
        const context = `${path} at ${width}px`;
        const gutter = Math.max(width > 620 ? 24 : 20, (width - 960) / 2);
        expect(geometry.scrollWidth, context).toBeLessThanOrEqual(width);
        for (const frame of [geometry.header, geometry.footer]) {
          expect(frame.left, context).toBeCloseTo(gutter, 1);
          expect(frame.right, context).toBeCloseTo(width - gutter, 1);
        }
        if (path !== '/404') {
          expect(geometry.main.left, context).toBeCloseTo(gutter, 1);
          expect(geometry.main.right, context).toBeCloseTo(width - gutter, 1);
          expect(geometry.heading.left, context).toBeCloseTo(gutter, 1);
        } else {
          expect(
            (geometry.heading.left + geometry.heading.right) / 2,
            context,
          ).toBeCloseTo(width / 2, 1);
        }
        for (const control of geometry.controls) {
          expect(control.left, context).toBeGreaterThanOrEqual(
            geometry.main.left,
          );
          expect(control.right, context).toBeLessThanOrEqual(
            geometry.main.right + 0.5,
          );
          expect(control.height, context).toBeGreaterThanOrEqual(44);
        }
      }
    });
  }
}

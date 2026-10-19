import { expect, test } from '@playwright/test';

for (const colorScheme of ['light', 'dark'] as const) {
  for (const width of [320, 360, 361, 375, 620, 621, 768, 1280, 1440]) {
    test(`${colorScheme} ${width}px footer stays centered without collisions`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 640 });
      await page.emulateMedia({ colorScheme });
      await page.goto('/');
      const geometry = await page.locator('footer nav').evaluate((nav) => {
        const bounds = nav.getBoundingClientRect();
        const groups = [...nav.children].map((group) =>
          group.getBoundingClientRect(),
        );
        return {
          centerError:
            groups[1]!.left +
            groups[1]!.width / 2 -
            (bounds.left + bounds.width / 2),
          leftGap: groups[1]!.left - groups[0]!.right,
          rightGap: groups[2]!.left - groups[1]!.right,
          targets: [...nav.querySelectorAll('a, [role="img"]')].map(
            (target) => {
              const rect = target.getBoundingClientRect();
              return { width: rect.width, height: rect.height };
            },
          ),
        };
      });
      expect(Math.abs(geometry.centerError)).toBeLessThanOrEqual(0.5);
      expect(geometry.leftGap).toBeGreaterThanOrEqual(4);
      expect(geometry.rightGap).toBeGreaterThanOrEqual(4);
      for (const target of geometry.targets) {
        expect(target.width).toBeGreaterThanOrEqual(44);
        expect(target.height).toBeGreaterThanOrEqual(44);
      }
      const link = page.locator('footer a[href="/pgp"]');
      const background = await link.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      );
      await link.hover();
      expect(
        await link.evaluate(
          (element) => getComputedStyle(element).backgroundColor,
        ),
      ).toBe(background);
      if (colorScheme === 'light' && width === 320) {
        await page.screenshot({
          path: '/tmp/portfolio-precision-home-320.png',
          fullPage: true,
        });
      }
    });

    test(`${colorScheme} ${width}px fields and actions align beside each other`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 640 });
      await page.emulateMedia({ colorScheme });
      for (const path of ['/rss', '/pgp']) {
        await page.goto(path);
        const rows = await page
          .locator('main input[readonly], main textarea')
          .evaluateAll((fields) =>
            fields.map((field) => {
              const bounds = field.getBoundingClientRect();
              const actions = field
                .parentElement!.querySelector('div')!
                .getBoundingClientRect();
              const buttons = [
                ...field.parentElement!.querySelectorAll('button, a'),
              ].map((button) => button.getBoundingClientRect().height);
              return {
                id: field.id,
                height: bounds.height,
                width: bounds.width,
                gap: actions.left - bounds.right,
                topError: actions.top - bounds.top,
                buttons,
              };
            }),
          );
        for (const row of rows) {
          expect(Math.abs(row.gap - 12), row.id).toBeLessThanOrEqual(0.5);
          expect(Math.abs(row.topError), row.id).toBeLessThanOrEqual(0.5);
          for (const height of row.buttons) {
            expect(Math.abs(height - 48), row.id).toBeLessThanOrEqual(0.5);
          }
          if (row.id !== 'public-key') {
            expect(Math.abs(row.height - 48), row.id).toBeLessThanOrEqual(0.5);
          } else if (width === 320) {
            expect(row.width).toBeGreaterThanOrEqual(176);
          }
        }
        if (path === '/pgp') {
          await expect
            .poll(() =>
              page
                .locator('#public-key')
                .evaluate((key) => key.scrollHeight <= key.clientHeight),
            )
            .toBe(true);
          if (colorScheme === 'light' && [320, 1280].includes(width)) {
            await page.screenshot({
              path: `/tmp/portfolio-precision-pgp-${width}.png`,
              fullPage: true,
            });
          }
        }
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
      }
    });
  }
}

test('shared page edges stay aligned through fractional breakpoint widths', async ({
  page,
}) => {
  await page.goto('/');
  for (const width of [620, 620.25, 620.5, 620.75, 621]) {
    await page.evaluate((width) => {
      document.querySelector('iframe')?.remove();
      const frame = document.createElement('iframe');
      frame.src = '/';
      frame.style.cssText = `border:0;width:${width}px;height:640px`;
      document.body.append(frame);
    }, width);
    const frame = page.frameLocator('iframe');
    await expect(frame.locator('main')).toBeVisible();
    const edges = await frame.locator('body').evaluate((body) =>
      ['body > header > nav', '#content > main', 'body > footer'].map(
        (selector) => {
          const rect = body.querySelector(selector)!.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        },
      ),
    );
    for (const edge of edges.slice(1)) {
      expect(
        Math.abs(edge.left - edges[0]!.left),
        `${width}px left`,
      ).toBeLessThanOrEqual(0.5);
      expect(
        Math.abs(edge.right - edges[0]!.right),
        `${width}px right`,
      ).toBeLessThanOrEqual(0.5);
    }
  }
});

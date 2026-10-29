import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const pgpPublicKey = readFileSync(
  new URL('../../public/pgp.asc', import.meta.url),
  'utf8',
).trim();
import { required } from '../../src/portfolio/required';
test.skip(
  !process.env['WITNESS_TEST_DATABASE_URL'],
  'Requires isolated local PostgreSQL',
);
test('measurement and automatic annotations work with a pasted public key and no moderator', async ({
  page,
  browser,
}) => {
  await page.goto('/log');
  const href = required(
    await page
      .locator('a[href^="/log/"]')
      .filter({ hasText: /./ })
      .first()
      .getAttribute('href'),
  );
  await page.goto(href);
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const readable = await noJs.newPage();
  await readable.goto(href);
  await expect(readable.locator('article')).toContainText('Onur');
  await expect(readable.locator('[data-witness-opt-in]')).toBeDisabled();
  await noJs.close();
  await page.getByRole('button', { name: 'Allow this measurement' }).click();
  await expect(page.locator('[data-witness-status]')).toContainText(
    /recorded|already counted/,
  );
  const root = page.locator('[data-annotations]').first();
  const selectText = async () =>
    page
      .locator('.log-body')
      .first()
      .evaluate((element) => {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          if ((node.textContent ?? '').trim().length > 20) {
            const range = document.createRange();
            range.setStart(node, 0);
            range.setEnd(node, 10);
            const selection = getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            break;
          }
        }
      });
  await selectText();
  await root.getByRole('button', { name: 'Annotate', exact: true }).click();
  const note = `Browser fixture ${crypto.randomUUID()} <script>alert(1)</script>`;
  await root.locator('[name="note"]').fill(note);
  await root.locator('[name="pgp"]').fill(pgpPublicKey);
  await expect(root.locator('[name="pgpSignature"]')).toHaveCount(0);
  await root.getByRole('button', { name: 'Publish annotation' }).click();
  await expect(root.locator('[data-annotation-status]')).toContainText(
    'Annotation published.',
  );
  await expect(root.locator('input[type="file"]')).toHaveCount(0);
  await expect(
    root.locator('[data-annotation-export], [data-annotation-own]'),
  ).toHaveCount(0);
  await selectText();
  await root.getByRole('button', { name: 'Annotate', exact: true }).click();
  await root.locator('[data-annotation-related] summary').click();
  const marker = root
    .locator('[data-annotation-marker]')
    .filter({ hasText: note.slice(0, 40) });
  await marker.click();
  const viewer = page.locator('[data-annotation-viewer]:popover-open');
  await expect(viewer).toContainText(note);
  await expect(viewer.locator('script')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/tmp/onur-witness-annotation-mobile.png' });
  await viewer
    .getByRole('button', { name: 'Withdraw annotation', exact: true })
    .click();
  await expect(root.locator('[data-annotation-status]')).toContainText(
    'Annotation withdrawn.',
  );
  await page.goto(`${href}/verified?v=1#stats`);
  await expect(page.locator('section[aria-labelledby="stats"]')).toContainText(
    'All-time witnesses',
  );
  await page.screenshot({ path: '/tmp/onur-witness-stats-mobile.png' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({ path: '/tmp/onur-witness-stats-dark.png' });
});

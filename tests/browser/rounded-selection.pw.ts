import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
const pgpPublicKey = readFileSync(
  new URL('../../public/pgp.asc', import.meta.url),
  'utf8',
).trim();
for (const colorScheme of ['light', 'dark'] as const) {
  test(`multiline selection has one padded outline in ${colorScheme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme });
    await page.goto('/log/cryptic-watchtower-watches');
    const paragraph = page.locator('.log-body p').first();
    await paragraph.scrollIntoViewIfNeeded();
    const text = await paragraph.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return element.textContent;
    });
    await expect(page.locator('html')).toHaveAttribute(
      'data-rounded-selection',
      '',
    );
    const path = page.locator('[data-selection-path]');
    await expect(path).toHaveAttribute('d', /Q/);
    const d = await path.getAttribute('d');
    expect(d?.match(/M/g)).toHaveLength(1);
    expect(await page.evaluate(() => getSelection()?.toString())).toBe(text);
    const button = page
      .getByRole('button', { name: 'Annotate selection' })
      .first();
    await expect(button).toBeVisible();
    await expect(button).toBeInViewport();
    await page.screenshot({
      path: `/tmp/onur-rounded-selection-${colorScheme}.png`,
    });
    await button.click();
    await expect(page.locator('[data-annotation-form]').first()).toBeVisible();
  });
}
test('local annotations publish without measurement or approval', async ({
  page,
}) => {
  await page.goto('/log/cryptic-watchtower-watches');
  const root = page.locator('[data-annotations]').first();
  await expect(root).toBeAttached();
  const paragraph = page.locator('.log-body p').first();
  await paragraph.scrollIntoViewIfNeeded();
  await paragraph.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
  await page
    .getByRole('button', { name: 'Annotate selection' })
    .first()
    .click();
  const note = `Local annotation ${crypto.randomUUID()}`;
  await root.locator('[name="note"]').fill(note);
  await root.locator('[name="pgp"]').fill(pgpPublicKey);
  await root.getByRole('button', { name: 'Publish annotation' }).click();
  await expect(root.locator('[data-annotation-status]')).toHaveText(
    'Annotation published.',
  );
  const id = await page.evaluate((body) => {
    const notes: unknown = JSON.parse(
      localStorage.getItem('annotation-own:cryptic-watchtower-watches') ?? '[]',
    );
    if (!Array.isArray(notes)) return undefined;
    for (const candidate of notes) {
      const note: unknown = candidate;
      if (
        note &&
        typeof note === 'object' &&
        'body' in note &&
        note.body === body &&
        'id' in note &&
        typeof note.id === 'string'
      )
        return note.id;
    }
    return undefined;
  }, note);
  expect(id).toBeTruthy();
  const marker = page.locator(`[data-annotation-id="${id ?? ''}"]`);
  await paragraph.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
  });
  await root.locator('[data-annotation-select]').click();
  await root.locator('[data-annotation-related] summary').click();
  await expect(marker).toBeVisible();
  await marker.click();
  await expect(
    page.locator('[data-annotation-viewer]:popover-open'),
  ).toContainText(note);
  await page
    .locator('[data-annotation-viewer]:popover-open')
    .getByRole('button', { name: 'Withdraw annotation', exact: true })
    .click();
  await expect(root.locator('[data-annotation-status]')).toHaveText(
    'Annotation withdrawn.',
  );
});
test('selection is site-wide while annotation controls exist only on Logs', async ({
  page,
}) => {
  for (const url of [
    '/',
    '/rss',
    '/pgp',
    '/contribute',
    '/log/cryptic-watchtower-watches/verified',
  ]) {
    await page.goto(url);
    await expect(page.locator('[data-annotations]')).toHaveCount(0);
    await page.locator('main h1').evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    });
    await expect(page.locator('[data-selection-path]')).toHaveAttribute(
      'd',
      /Q/,
    );
  }
});
test('annotation editor preserves the quote and draft without scrolling the document', async ({
  page,
}) => {
  await page.goto('/log/cryptic-watchtower-watches');
  const paragraph = page.locator('.log-body p').first();
  await paragraph.scrollIntoViewIfNeeded();
  await paragraph.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
  });
  const quote = await paragraph.textContent();
  const scroll = await page.evaluate(() => scrollY);
  await page
    .getByRole('button', { name: 'Annotate selection' })
    .first()
    .click();
  const form = page.locator('[data-annotation-form]').first();
  await expect(form).toBeVisible();
  expect(
    await form.evaluate(
      (element) => element.getBoundingClientRect().bottom <= innerHeight,
    ),
  ).toBe(true);
  await expect(form.locator('[data-annotation-quote]')).toHaveText(quote ?? '');
  expect(Math.abs((await page.evaluate(() => scrollY)) - scroll)).toBeLessThan(
    2,
  );
  await form.locator('[name="note"]').fill('Saved local draft');
  await page.keyboard.press('Escape');
  await expect(form).not.toBeVisible();
  await page
    .getByRole('button', { name: 'Annotate selection' })
    .first()
    .click();
  await expect(form.locator('[name="note"]')).toHaveValue('Saved local draft');
  await form.locator('[name="pgp"]').fill(pgpPublicKey);
  await form.getByRole('button', { name: 'Publish annotation' }).click();
  await expect(page.locator('[data-annotation-status]').first()).toHaveText(
    'Annotation published.',
  );
  const id = await page.evaluate(() => {
    const notes: unknown = JSON.parse(
      localStorage.getItem('annotation-own:cryptic-watchtower-watches') ?? '[]',
    );
    if (!Array.isArray(notes)) return undefined;
    for (const candidate of notes) {
      const note: unknown = candidate;
      if (
        note &&
        typeof note === 'object' &&
        'body' in note &&
        note.body === 'Saved local draft' &&
        'id' in note &&
        typeof note.id === 'string'
      )
        return note.id;
    }
    return undefined;
  });
  expect(id).toBeTruthy();
  const marker = page.locator(`[data-annotation-id="${id ?? ''}"]`);
  await paragraph.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
  });
  await page.locator('[data-annotation-select]').first().click();
  const related = page.locator('[data-annotation-related]').first();
  if (!(await related.evaluate((element) => element.hasAttribute('open'))))
    await related.locator('summary').click();
  await marker.click();
  const viewer = page.locator('[data-annotation-viewer]:popover-open');
  const download = page.waitForEvent('download');
  await viewer.getByRole('button', { name: 'Download annotation' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.jsonld$/);
  await viewer
    .getByRole('button', { name: 'Edit annotation', exact: true })
    .click();
  await expect(form.locator('[name="note"]')).toHaveValue('Saved local draft');
  await form.locator('[name="note"]').fill('Updated from annotation');
  await form.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('[data-annotation-status]').first()).toHaveText(
    'Annotation published.',
  );
  await paragraph.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
  });
  await page.locator('[data-annotation-select]').first().click();
  await marker.click();
  await expect(viewer).toContainText('Updated from annotation');
  await viewer
    .getByRole('button', { name: 'Withdraw annotation', exact: true })
    .click();
  await expect(page.locator('[data-annotation-status]').first()).toHaveText(
    'Annotation withdrawn.',
  );
});

test('mouse drag opens the Log annotation editor', async ({ page }) => {
  await page.goto('/log/cryptic-watchtower-watches');
  const paragraph = page.locator('.log-body p').first();
  await paragraph.scrollIntoViewIfNeeded();
  await expect(
    page.locator('[data-annotation-controls]').first(),
  ).not.toHaveAttribute('hidden');
  const box = await paragraph.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  await page.mouse.move(box.x + 3, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + Math.min(300, box.width - 5), box.y + 35, {
    steps: 15,
  });
  await page.mouse.up();
  const button = page
    .getByRole('button', { name: 'Annotate selection' })
    .first();
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.locator('[data-annotation-form]').first()).toBeVisible();
  await expect(page.locator('[data-annotation-quote]').first()).not.toBeEmpty();
});

test('annotation controls stay out of the article until text is selected', async ({
  page,
}) => {
  await page.goto('/log/cryptic-watchtower-watches');
  const root = page.locator('[data-annotations]').first();
  await expect(root.locator('[data-annotation-controls]')).not.toHaveAttribute(
    'hidden',
  );
  await expect(root.locator('[data-annotation-select]')).toBeHidden();
  await expect(root.locator('[data-annotation-form]')).toBeHidden();
  await expect(
    root.getByText('Export annotation key', { exact: true }),
  ).toBeHidden();
  await expect(
    root.getByText('Manage your annotations', { exact: true }),
  ).toBeHidden();
  await expect(
    root.getByText('Restore annotation key', { exact: true }),
  ).toBeHidden();
  await expect(
    page.getByText('Select text in this revision to annotate it.', {
      exact: false,
    }),
  ).toHaveCount(0);
});

test('published notes never insert empty square buttons into Log text', async ({
  page,
}) => {
  await page.goto('/log/cryptic-watchtower-watches');
  await expect(
    page.locator('[data-annotation-controls]').first(),
  ).not.toHaveAttribute('hidden');
  await expect(page.locator('.log-body [data-annotation-marker]')).toHaveCount(
    0,
  );
  await expect(page.locator('[data-annotation-notes]').first()).toBeHidden();
});

test('a quotation longer than 4000 characters opens intact', async ({
  page,
}) => {
  await page.goto('/log/cryptic-watchtower-watches');
  const body = page.locator('.log-body').first();
  const text = await body.evaluate((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const first = walker.nextNode();
    if (!first) throw new Error('Missing article text');
    let end = first;
    let length = first.textContent?.length ?? 0;
    while (length < 5000) {
      const next = walker.nextNode();
      if (!next) break;
      end = next;
      length += end.textContent?.length ?? 0;
    }
    const range = document.createRange();
    range.setStart(first, 0);
    range.setEnd(end, end.textContent?.length ?? 0);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
    return range.toString();
  });
  expect(text.length).toBeGreaterThan(4000);
  const button = page.locator('[data-annotation-select]').first();
  await expect(button).toBeVisible();
  await expect(button).toBeInViewport();
  await button.click();
  await expect(page.locator('[data-annotation-quote]').first()).toHaveText(
    text,
  );
  await expect(page.locator('[data-annotation-form]').first()).toBeInViewport();
});

test('dragging text never places the annotation trigger under the pointer', async ({
  page,
}) => {
  await page.goto('/log/cryptic-watchtower-watches');
  const paragraph = page.locator('.log-body p').first();
  await paragraph.scrollIntoViewIfNeeded();
  const box = await paragraph.boundingBox();
  if (!box) throw new Error('Missing paragraph');
  await page.mouse.move(box.x + 3, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 35, { steps: 10 });
  const trigger = page.locator('[data-annotation-select]').first();
  await expect(trigger).toBeHidden();
  await page.mouse.up();
  await expect(trigger).toBeVisible();
  await trigger.click();
  const form = page.locator('[data-annotation-form]').first();
  await expect(form.locator('input[type="file"]')).toHaveCount(0);
  await expect(form.getByText('Annotation settings')).toHaveCount(0);
  await expect(
    form.locator(
      '[data-annotation-export], [data-annotation-own], [data-annotation-resume]',
    ),
  ).toHaveCount(0);
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`annotation hover and panel borders follow shared controls in ${colorScheme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/log/cryptic-watchtower-watches');
    const paragraph = page.locator('.log-body p').first();
    await paragraph.scrollIntoViewIfNeeded();
    await paragraph.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    });
    const trigger = page.locator('[data-annotation-select]').first();
    await expect(trigger).toBeVisible();
    await page.mouse.move(5, 100);
    const normal = await trigger.evaluate((element) => ({
      color: getComputedStyle(element).color,
      background: getComputedStyle(element).backgroundColor,
    }));
    await trigger.hover();
    await expect(trigger).toHaveCSS('background-color', normal.color);
    await expect(trigger).toHaveCSS('color', normal.background);
    await trigger.click();
    const form = page.locator('[data-annotation-form]').first();
    const sharedBorder = await page
      .locator('dialog')
      .first()
      .evaluate((element) => getComputedStyle(element).backgroundImage);
    await expect(form).toHaveCSS('background-image', sharedBorder);
    await expect(form).toHaveCSS('border-radius', '12px');
    await expect(form.locator('[name="note"]')).toHaveCSS(
      'border-radius',
      '8px',
    );
    await page.screenshot({
      path: `/tmp/onur-annotation-shared-${colorScheme}.png`,
    });
  });
}

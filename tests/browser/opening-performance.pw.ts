import { expect, test } from '@playwright/test';

test('home completes and Find works while activity islands are delayed', async ({
  page,
}) => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route('**/_server-islands/**', async (route) => {
    requests++;
    await ready;
    await route.abort();
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => requests).toBeGreaterThanOrEqual(2);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.locator('#open-search').click();
    await expect(
      page.getByRole('dialog', { name: 'Search pages' }),
    ).toBeVisible();
    await page.locator('#search-query').fill('Monero');
    await expect(
      page.locator('#search-results a[href="/contribute"]'),
    ).toBeVisible();
  } finally {
    release();
  }
});

test('home has bounded inline CSS and does not fetch technology masks before visibility', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const technologyRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/brand/technologies/'))
      technologyRequests.push(request.url());
  });
  await page.goto('/');
  expect(technologyRequests).toEqual([]);
  expect(await page.locator('link[rel="stylesheet"]').count()).toBe(0);
  const cssBytes = await page
    .locator('head style')
    .evaluateAll((styles) =>
      styles.reduce(
        (total, style) =>
          total + new TextEncoder().encode(style.textContent).length,
        0,
      ),
    );
  expect(cssBytes).toBeLessThan(48 * 1024);
  const icon = page.locator('[data-icon="techPython"]');
  await icon.scrollIntoViewIfNeeded();
  await expect.poll(() => technologyRequests.length).toBeGreaterThan(0);
  await expect(icon.locator('> span')).toBeVisible();
});

test('Find filters offline when the optional ranking engine cannot load', async ({
  page,
  context,
}) => {
  const engines: string[] = [];
  await page.route('**/_astro/search-engine.*.js', async (route) => {
    engines.push(route.request().url());
    await route.abort();
  });
  await page.goto('/');
  expect(engines).toEqual([]);
  await expect(page.locator('#search-query')).toBeEnabled();
  await context.setOffline(true);
  await page.locator('#open-search').click();
  await page.locator('#search-query').fill('provid');
  await expect(page.locator('#search-results')).toContainText(
    'Become a massive value provider',
  );
  await page.locator('#search-query').fill('zzzzunmatched');
  await expect(page.locator('#search-status')).toHaveText('Nothing found.');
  await context.setOffline(false);
});

test('a pending glass map recovers after bfcache restoration', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const OriginalWorker = Worker;
    window.Worker = new Proxy(OriginalWorker, {
      construct(Target, args: ConstructorParameters<typeof Worker>) {
        const worker = new Target(...args);
        worker.addEventListener('message', () => {
          const root = document.documentElement;
          root.dataset['workerResults'] = String(
            Number(root.dataset['workerResults'] ?? 0) + 1,
          );
        });
        return worker;
      },
    });
  });
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  let workerRequests = 0;
  await page.route('**/_astro/*glass-worker*.js', async (route) => {
    workerRequests++;
    await ready;
    await route.continue();
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect.poll(() => workerRequests).toBeGreaterThan(0);
    await page.evaluate(() =>
      dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })),
    );
    release();
    await expect
      .poll(async () =>
        Number(await page.locator('html').getAttribute('data-worker-results')),
      )
      .toBeGreaterThan(0);
    await page.evaluate(() =>
      dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })),
    );
    await expect(page.locator('[data-nav-glass]')).toHaveAttribute(
      'data-glass-state',
      'refractive',
    );
  } finally {
    release();
  }
});

test('a failed glass worker retains readable native navigation', async ({
  page,
}) => {
  await page.route('**/_astro/*glass-worker*.js', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('[data-nav-glass]')).toHaveAttribute(
    'data-glass-state',
    'reflective',
  );
  await page.locator('#open-search').click();
  await expect(
    page.getByRole('dialog', { name: 'Search pages' }),
  ).toBeVisible();
});

test('the reflective browser tier never downloads a displacement worker', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Firefox/140.0',
    }),
  );
  const workers: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('glass-worker')) workers.push(request.url());
  });
  await page.goto('/');
  await expect(page.locator('[data-nav-glass]')).toHaveAttribute(
    'data-glass-state',
    'reflective',
  );
  expect(workers).toEqual([]);
});

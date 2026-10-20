import { expect, test } from '@playwright/test';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`${colorScheme} home embeds keep readable columns and bounded posts`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    for (const width of [320, 621, 900, 901, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const x = await page.locator('[aria-labelledby="embed-x"]').boundingBox();
      const github = await page
        .locator('[aria-labelledby="embed-github"]')
        .boundingBox();
      expect(
        await page
          .locator('[aria-labelledby="embed-x"] li')
          .evaluateAll((items) =>
            items.every(
              (item) => getComputedStyle(item).borderTopWidth === '0px',
            ),
          ),
      ).toBe(true);
      expect(x).not.toBeNull();
      expect(github).not.toBeNull();
      if (width < 901)
        expect(github!.y).toBeGreaterThanOrEqual(x!.y + x!.height);
      else {
        expect(github!.y).toBeCloseTo(x!.y, 0);
        expect(github!.height).toBeCloseTo(x!.height, 0);
      }
      const postRows = await page
        .locator('[aria-labelledby="embed-x"] li')
        .evaluateAll((items) =>
          items.map((item) => item.getBoundingClientRect().height),
        );
      const repositoryRows = await page
        .locator('[aria-labelledby="embed-github"] li')
        .evaluateAll((items) =>
          items.map((item) => item.getBoundingClientRect().height),
        );
      if (postRows.length && repositoryRows.length) {
        for (const height of [...postRows, ...repositoryRows])
          expect(height).toBeCloseTo(postRows[0]!, 0);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        await page
          .locator('[aria-labelledby="embed-x"] li a')
          .evaluateAll((links) =>
            links.every(
              (link) =>
                link.getBoundingClientRect().height <=
                parseFloat(getComputedStyle(link).lineHeight) * 2 + 1,
            ),
          ),
      ).toBe(true);
    }
  });
}

test('Spotify refreshes recent tracks, playback timing and the empty player', async ({
  page,
}) => {
  const startedAt = Date.UTC(2026, 9, 15, 10, 0);
  await page.clock.install({ time: new Date(startedAt + 64_000) });
  await page.clock.pauseAt(new Date(startedAt + 65_000));
  let empty = false;
  await page.route('**/spotify.json', (route) =>
    route.fulfill({
      json: {
        id: 'spotify',
        title: 'Listening',
        source: 'Spotify',
        href: 'https://open.spotify.com/user/31i47bq4pcvconkgu7wxmukrduua',
        status: empty ? 'empty' : 'ready',
        playbackState: empty ? 'idle' : 'playing',
        items: empty
          ? []
          : [
              {
                kind: 'track',
                title: 'Current track',
                playback: { startedAt, endsAt: startedAt + 180_000 },
                detail: 'Artist',
                href: 'https://open.spotify.com/track/0000000000000000000009',
              },
            ],
        recentTracks: empty
          ? []
          : Array.from({ length: 5 }, (_, index) => ({
              kind: 'track',
              title: `Recent ${index + 1} <script>`,
              detail: 'Artist',
              href: `https://open.spotify.com/track/${String(index).padStart(22, '0')}`,
            })),
      },
    }),
  );
  await page.goto('/');
  await page.clock.fastForward(30_001);
  await expect(page.locator('#spotify-embed a[href*="/user/"]')).toHaveCount(0);
  await expect(page.locator('[data-spotify-elapsed]')).toHaveText('1:35');
  await expect(page.locator('[data-spotify-duration]')).toHaveText('3:00');
  await expect(
    page.getByRole('progressbar', { name: 'Track progress' }),
  ).toBeVisible();
  await page.clock.fastForward(1000);
  await expect(page.locator('[data-spotify-elapsed]')).toHaveText('1:36');
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent('pagehide', { persisted: true }),
    ),
  );
  await page.clock.fastForward(2000);
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: true }),
    ),
  );
  await page.clock.fastForward(1000);
  await expect(page.locator('[data-spotify-elapsed]')).toHaveText('1:39');

  await expect(page.locator('[data-spotify-recent] li')).toHaveCount(5);
  const recentList = page.locator('[data-spotify-recent] ol');
  const summary = page.locator('[data-spotify-toggle]');
  await expect(recentList).toBeHidden();
  await summary.click();
  await expect(recentList).toBeVisible();
  const arrow = summary.locator('> span').last();
  expect(await arrow.evaluate((node) => getComputedStyle(node).transform)).toBe(
    'matrix(-1, 0, 0, -1, 0, 0)',
  );
  await summary.press('Enter');
  await expect(recentList).toBeHidden();
  await summary.press('Space');
  await expect(recentList).toBeVisible();
  await page.locator('#embed-spotify').click();
  await expect(recentList).toBeHidden();
  await page.locator('#spotify-embed').click({ position: { x: 4, y: 4 } });
  await expect(recentList).toBeVisible();

  await expect(page.locator('[data-spotify-current]')).toContainText(
    'Current track',
  );
  await expect(page.locator('[data-spotify-recent]')).not.toContainText(
    'Current track',
  );
  await expect(page.locator('[data-spotify-recent] script')).toHaveCount(0);
  for (const width of [320, 621, 901, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const spotify = await page.locator('#spotify-embed').boundingBox();
    const main = await page.locator('main').boundingBox();
    const padding = await page
      .locator('main')
      .evaluate((node) => parseFloat(getComputedStyle(node).paddingRight));
    expect(spotify!.width).toBeCloseTo(main!.width - padding, 0);
    const toggleBox = await summary.boundingBox();
    const headerBox = await page.locator('#spotify-embed header').boundingBox();
    const topBox = await summary.locator('..').boundingBox();
    expect(
      Math.abs(toggleBox!.x + toggleBox!.width - topBox!.x - topBox!.width),
    ).toBeLessThan(1);
    expect(toggleBox!.y + toggleBox!.height / 2).toBeGreaterThanOrEqual(
      headerBox!.y,
    );
    expect(toggleBox!.y + toggleBox!.height / 2).toBeLessThanOrEqual(
      headerBox!.y + headerBox!.height,
    );
    expect(
      await page
        .locator('[data-spotify-recent] li')
        .evaluateAll((items) =>
          items.every(
            (item, index) =>
              !index ||
              item.getBoundingClientRect().top >=
                items[index - 1]!.getBoundingClientRect().bottom,
          ),
        ),
    ).toBe(true);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  empty = true;
  await page.clock.fastForward(30_001);
  await expect(page.locator('#spotify-embed')).toBeVisible();
  await expect(page.locator('#embed-spotify')).toHaveText('Playing nothing');
  await expect(page.locator('[data-spotify-current]')).toBeHidden();
  await expect(page.locator('[data-spotify-toggle]')).toBeHidden();
  await expect(page.locator('[data-spotify-progress]')).toBeHidden();
});

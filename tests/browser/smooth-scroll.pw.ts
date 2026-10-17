import { expect, test } from '@playwright/test';

test('anchors preserve focus and history, and keyboard input stops momentum', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    document.body.style.minHeight = '4000px';
    const link = document.createElement('a');
    link.id = 'jump-fixture';
    link.href = '#destination-fixture';
    link.textContent = 'Jump';
    link.style.cssText = 'position:absolute;top:100px;left:10px';
    const destination = document.createElement('h2');
    destination.id = 'destination-fixture';
    destination.textContent = 'Destination';
    destination.style.cssText = 'position:absolute;top:1500px';
    document.body.append(link, destination);
  });
  await page.locator('#jump-fixture').click();
  await expect(page).toHaveURL(/#destination-fixture$/);
  await expect(page.locator('#destination-fixture')).toBeFocused();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(1500);
  await page.clock.install();
  await page.evaluate(() =>
    document.body.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 600, bubbles: true, cancelable: true }),
    ),
  );
  await page.clock.runFor(100);
  await page.keyboard.press('Escape');
  const stopped = await page.evaluate(() => scrollY);
  await page.clock.runFor(1000);
  expect(await page.evaluate(() => scrollY)).toBe(stopped);
});

test('the donation profile responds faster than home at the same animation time', async ({
  page,
}) => {
  await page.clock.install();
  const positions: number[] = [];
  for (const path of ['/', '/donate']) {
    await page.goto(path);
    await page.evaluate(() => {
      document.body.style.minHeight = '4000px';
      document.body.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: 600,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await page.clock.runFor(120);
    positions.push(await page.evaluate(() => window.scrollY));
  }
  expect(positions[0]).toBeGreaterThan(0);
  expect(positions[1]).toBeGreaterThan(positions[0]!);
  expect(positions[1]).toBeLessThan(600);
});

test('pages expose distinct scroll profiles and wheel movement settles smoothly', async ({
  page,
}) => {
  const profiles = new Set<string>();
  for (const path of ['/', '/log', '/pgp', '/rss', '/donate', '/404']) {
    await page.goto(path);
    profiles.add(
      (await page.locator('html').getAttribute('data-scroll-profile')) ?? '',
    );
  }
  expect(profiles.size).toBe(6);
  expect(profiles.has('')).toBe(false);
  await page.goto('/');
  await page.evaluate(() => {
    document.body.style.minHeight = '4000px';
  });
  await page.mouse.move(10, 200);
  await page.mouse.wheel(0, 600);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(600);
  await page.mouse.wheel(0, -300);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(300);
});

test('reduced motion and nested scrolling retain native wheel handling', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    document.body.style.minHeight = '4000px';
    const panel = document.createElement('div');
    panel.id = 'scroll-fixture';
    panel.style.cssText =
      'position:fixed;top:100px;left:100px;width:200px;height:200px;overflow:auto';
    panel.innerHTML = '<div style="height:1000px">Scrollable panel</div>';
    document.body.append(panel);
  });
  await page.mouse.move(150, 150);
  await page.mouse.wheel(0, 200);
  await expect
    .poll(() => page.locator('#scroll-fixture').evaluate((el) => el.scrollTop))
    .toBe(200);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const cancelled = await page.evaluate(() => {
    const event = new WheelEvent('wheel', {
      deltaY: 100,
      bubbles: true,
      cancelable: true,
    });
    document.body.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(cancelled).toBe(false);
});

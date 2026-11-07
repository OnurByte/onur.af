import { test, expect } from '@playwright/test';
import { logEntries } from '../../src/portfolio/log';
import { snapshotsFor } from '../../src/portfolio/memento';
const entry = logEntries[0];
if (!entry) throw new Error('Missing Log fixture');
const snapshot = snapshotsFor(entry.id)[0];
if (!snapshot) throw new Error('Missing snapshot fixture');
test('Memento serves immutable captured bytes and negotiates consistently', async ({
  request,
  page,
}) => {
  const path = `/log/${entry.id}`;
  const date = new Date(snapshot.archivedAt).toUTCString();
  const gate = await request.get(`${path}/timegate`, {
    headers: { 'Accept-Datetime': date },
    maxRedirects: 0,
  });
  expect(gate.status()).toBe(302);
  expect(gate.headers()['vary']).toContain('Accept-Datetime');
  const head = await request.head(`${path}/timegate`, {
    headers: { 'Accept-Datetime': date },
    maxRedirects: 0,
  });
  expect(head.headers()['location']).toBe(gate.headers()['location']);
  const memento = await request.get(
    `${path}/memento/v${String(snapshot.version)}`,
  );
  expect(await memento.text()).toBe(snapshot.html);
  expect(memento.headers()['memento-datetime']).toBe(date);
  expect(
    (
      await request.get(`${path}/timegate`, {
        headers: { 'Accept-Datetime': 'bad' },
      })
    ).status(),
  ).toBe(400);
  await page.goto(`${path}/memento/v${String(snapshot.version)}`);
  await expect(
    page.getByRole('link', { name: 'Current revision' }),
  ).toHaveAttribute('href', path);
  await expect(page.locator('script')).toHaveCount(0);
  expect(
    (await request.get(`${path}/timemap`)).headers()['content-type'],
  ).toContain('application/link-format');
});

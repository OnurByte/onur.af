import { required } from '../src/portfolio/required';
import { afterAll, expect, test } from 'bun:test';
import { Pool } from 'pg';
import { handleWebmention as POST } from '../src/pages/api/webmention';
import { listedLogEntries } from '../src/portfolio/log';
import { WebmentionStore } from '../src/server/webmentions/store';
const database = process.env['WEBMENTIONS_TEST_DATABASE_URL'];
const pool = new Pool({ connectionString: database });
afterAll(async () => {
  await pool.end();
});
const context = (body: string) => ({
  request: new Request('https://onur.af/api/webmention', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  }),
  clientAddress: '127.0.0.1',
  site: new URL('https://onur.af'),
});
test.skipIf(!database)(
  'endpoint queues valid forms, rejects duplicate fields and malformed URL encoding',
  async () => {
    const previous = { ...process.env };
    process.env['WEBMENTIONS_ENABLED'] = '1';
    process.env['WEBMENTIONS_DATABASE_URL'] = database;
    process.env['WEBMENTIONS_RATE_SECRET'] =
      'local-fixture-rate-secret-at-least-thirty-two';
    process.env['SITE_URL'] = 'https://onur.af';
    try {
      await new WebmentionStore(pool).migrate();
      const target = `https://onur.af/log/${required(listedLogEntries[0]).id}`;
      const body = new URLSearchParams({
        source: 'https://endpoint.example/post',
        target,
      }).toString();
      expect((await POST(context(body))).status).toBe(202);
      expect(
        (await POST(context(body + '&source=https%3A%2F%2Fsecond.example')))
          .status,
      ).toBe(400);
      expect(
        (await POST(context(body.replace('post', 'post%ZZ')))).status,
      ).toBe(400);
      expect(
        (await POST(context(body.replace('post', 'post%FF')))).status,
      ).toBe(400);
    } finally {
      for (const key of [
        'WEBMENTIONS_ENABLED',
        'WEBMENTIONS_DATABASE_URL',
        'WEBMENTIONS_RATE_SECRET',
        'SITE_URL',
      ]) {
        if (previous[key] === undefined)
          Reflect.deleteProperty(process.env, key);
        else process.env[key] = previous[key];
      }
    }
  },
);

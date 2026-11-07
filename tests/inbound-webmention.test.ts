import { required } from '../src/portfolio/required';
import { expect, test } from 'bun:test';
import { listedLogEntries as logEntries } from '../src/portfolio/log';
import {
  resolveMentionTarget,
  validateMention,
} from '../src/portfolio/inbound-webmention';
const response = (body: string | null, init?: ResponseInit) =>
  Promise.resolve(new Response(body, init));
const origin = 'https://onur.af';
const target = `${origin}/log/${required(logEntries[0]).id}`;
test('accepts only canonical listed article and real quote targets', () => {
  expect(resolveMentionTarget(target, origin)?.logId).toBe(
    required(logEntries[0]).id,
  );
  expect(resolveMentionTarget(target + '/quote/v1-0-1', origin)?.kind).toBe(
    'passage',
  );
  for (const suffix of [
    '/',
    '?v=1',
    '#x',
    '/quote/v999-0-1',
    '/quote/v1-0-999999',
    '/quote/v1-00-01',
  ])
    expect(resolveMentionTarget(target + suffix, origin)).toBeNull();
  expect(
    resolveMentionTarget(
      target.replace(origin, 'https://evil.example'),
      origin,
    ),
  ).toBeNull();
});
test('validation resolves HTML base and relative links without copying executable markup', async () => {
  const result = await validateMention(
    'https://source.example/path/post',
    target,
    () =>
      response(
        `<base href="${origin}/"><title>A &amp; B</title><a href="log/${required(logEntries[0]).id}">link</a><script>bad()</script>`,
        { headers: { 'content-type': 'text/html' } },
      ),
  );
  expect(result.status).toBe('validated');
  expect(result.title).toBe('A & B');
});
test('removed source is distinct from temporary failure and absence of a link', async () => {
  expect(
    (
      await validateMention('https://source.example/p', target, () =>
        response(null, { status: 410 }),
      )
    ).status,
  ).toBe('removed');
  expect(
    (
      await validateMention('https://source.example/p', target, () =>
        response(null, { status: 503 }),
      )
    ).status,
  ).toBe('unreachable');
  expect(
    (
      await validateMention('https://source.example/p', target, () =>
        response('no link', { headers: { 'content-type': 'text/html' } }),
      )
    ).status,
  ).toBe('removed');
  expect(
    (
      await validateMention('https://source.example/p', target, () =>
        response(`<script>"<a href='${target}'>"</script>`, {
          headers: { 'content-type': 'text/html' },
        }),
      )
    ).status,
  ).toBe('removed');
});
test('unsafe sources, unsupported and oversized documents fail closed', async () => {
  let calls = 0;
  expect(
    (
      await validateMention('https://127.0.0.1/', target, () => {
        calls++;
        return Promise.resolve(new Response(''));
      })
    ).status,
  ).toBe('rejected');
  expect(calls).toBe(0);
  expect(
    (
      await validateMention('https://source.example/', target, () =>
        response('{}', {
          headers: { 'content-type': 'application/json' },
        }),
      )
    ).status,
  ).toBe('rejected');
  expect(
    (
      await validateMention('https://source.example/', target, () =>
        response('a'.repeat(2_000_001), {
          headers: { 'content-type': 'text/html' },
        }),
      )
    ).status,
  ).toBe('rejected');
});

test('optional reference listing remains readable when receiver configuration is unavailable', async () => {
  const { visibleWebmentions } =
    await import('../src/server/webmentions/service');
  const priorEnabled = process.env['WEBMENTIONS_ENABLED'];
  const priorDatabase = process.env['WEBMENTIONS_DATABASE_URL'];
  process.env['WEBMENTIONS_ENABLED'] = '1';
  delete process.env['WEBMENTIONS_DATABASE_URL'];
  try {
    expect(await visibleWebmentions('one-two-three')).toEqual([]);
  } finally {
    if (priorEnabled === undefined) delete process.env['WEBMENTIONS_ENABLED'];
    else process.env['WEBMENTIONS_ENABLED'] = priorEnabled;
    if (priorDatabase === undefined)
      delete process.env['WEBMENTIONS_DATABASE_URL'];
    else process.env['WEBMENTIONS_DATABASE_URL'] = priorDatabase;
  }
});

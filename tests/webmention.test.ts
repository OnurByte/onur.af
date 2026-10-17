import { expect, test } from 'bun:test';
import {
  discoverWebmention,
  deliverWebmentions,
} from '../src/portfolio/webmention';

test('discovers HTTP Link and HTML endpoints including relative URLs', () => {
  expect(
    discoverWebmention(
      'https://target.example/post',
      new Headers({ Link: '</mention>; rel="alternate webmention"' }),
      '',
    ),
  ).toBe('https://target.example/mention');
  expect(
    discoverWebmention(
      'https://target.example/post',
      new Headers(),
      '<link href="/send?a=1&amp;b=2" rel="webmention">',
    ),
  ).toBe('https://target.example/send?a=1&b=2');
  expect(
    discoverWebmention(
      'https://target.example/post',
      new Headers(),
      '<!-- <link rel="webmention" href="https://evil.example/"> -->',
    ),
  ).toBeUndefined();
});

test('delivery is isolated, retryable and scoped to exact source revision bytes', async () => {
  const calls: string[] = [];
  const request = async (
    url: string,
    options?: { method?: string; body?: string },
  ) => {
    calls.push(`${options?.method ?? 'GET'} ${url}`);
    if (url === 'https://onur.example/log/quiet-river-flows')
      return new Response(
        '<article class="h-entry" data-log-version="1"><a href="https://one.example/post">One</a><a href="https://two.example/post">Two</a></article>',
      );
    if (url.endsWith('.md')) return new Response('exact markdown');
    if (url === 'https://one.example/post')
      return new Response('<a rel="webmention" href="/inbox">Send</a>');
    if (url === 'https://one.example/inbox') {
      expect(options?.body).toBe(
        'source=https%3A%2F%2Fonur.example%2Flog%2Fquiet-river-flows&target=https%3A%2F%2Fone.example%2Fpost',
      );
      return new Response('', { status: 202 });
    }
    throw new Error('Unavailable');
  };
  const input = {
    version: 1,
    source: 'https://onur.example/log/quiet-river-flows',
    revisionUrl: 'https://onur.example/proofs/quiet-river-flows-v1.md',
    markdown: 'exact markdown',
    targets: ['https://one.example/post', 'https://two.example/post'],
  };
  const first = await deliverWebmentions(input, [], request);
  expect(first.map((item) => item.status)).toEqual(['sent', 'failed']);
  const second = await deliverWebmentions(input, first, request);
  expect(second.map((item) => item.status)).toEqual(['sent', 'failed']);
  expect(
    calls.filter((call) => call === 'POST https://one.example/inbox'),
  ).toHaveLength(1);
  await expect(
    deliverWebmentions({ ...input, markdown: 'new content' }, [], request),
  ).rejects.toThrow('live');
});

test('redirected targets discover relative endpoints at their effective URL while retaining original target', async () => {
  for (const effective of [
    'https://new.example/articles/post',
    'https://old.example/articles/post',
  ]) {
    const delivered: { url: string; body: string | undefined }[] = [];
    const request = async (
      url: string,
      options?: { method?: string; body?: string },
    ) => {
      if (url.endsWith('.md')) return new Response('content');
      if (url === 'https://source.example/log/quiet-river-flows')
        return new Response(
          '<article class="h-entry" data-log-version="1"><a href="https://old.example/post">Target</a></article>',
        );
      if (url === 'https://old.example/post') {
        const response = new Response(
          '<link rel="webmention" href="../inbox">',
        );
        Object.defineProperty(response, 'url', { value: effective });
        return response;
      }
      delivered.push({ url, body: options?.body });
      return new Response('', { status: 202 });
    };
    await deliverWebmentions(
      {
        source: 'https://source.example/log/quiet-river-flows',
        version: 1,
        revisionUrl: 'https://source.example/proofs/quiet-river-flows-v1.md',
        markdown: 'content',
        targets: ['https://old.example/post'],
      },
      [],
      request,
    );
    expect(delivered[0]!.url).toBe(new URL('../inbox', effective).href);
    expect(new URLSearchParams(delivered[0]!.body).get('target')).toBe(
      'https://old.example/post',
    );
  }
});

test('each accepted receipt is persisted before attempting the next target', async () => {
  const events: string[] = [];
  const request = async (url: string, options?: { method?: string }) => {
    if (url.endsWith('.md')) return new Response('content');
    if (url.startsWith('https://source.example/'))
      return new Response(
        '<article class="h-entry" data-log-version="1"><a href="https://one.example/post">One</a><a href="https://two.example/post">Two</a></article>',
      );
    events.push(`${options?.method ?? 'GET'} ${url}`);
    return new Response(
      options?.method === 'POST' ? '' : '<link rel="webmention" href="/inbox">',
    );
  };
  await deliverWebmentions(
    {
      source: 'https://source.example/log/quiet-river-flows',
      version: 1,
      revisionUrl: 'https://source.example/proofs/quiet-river-flows-v1.md',
      markdown: 'content',
      targets: ['https://one.example/post', 'https://two.example/post'],
    },
    [],
    request,
    async (receipt) => {
      events.push(`persist ${receipt.target}`);
    },
  );
  expect(
    events.indexOf('persist https://one.example/post'),
  ).toBeGreaterThanOrEqual(0);
  expect(events.indexOf('persist https://one.example/post')).toBeLessThan(
    events.indexOf('GET https://two.example/post'),
  );
  expect(events).toContain('persist https://two.example/post');
});

import { expect, test } from 'bun:test';
import { gunzipSync } from 'node:zlib';
import { compressHtml } from '../src/server/html-compression';

const request = (encoding: string) =>
  new Request('http://portfolio.example/', {
    headers: { 'Accept-Encoding': encoding },
  });
test('compresses HTML without changing content or indexing headers', async () => {
  const response = compressHtml(
    request('br, gzip'),
    new Response('<main>Hello</main>', {
      headers: { 'Content-Type': 'text/html', 'X-Robots-Tag': 'index, follow' },
    }),
  );
  expect(response.headers.get('Content-Encoding')).toBe('gzip');
  expect(response.headers.get('Vary')).toContain('Accept-Encoding');
  expect(response.headers.get('X-Robots-Tag')).toBe('index, follow');
  expect(gunzipSync(Buffer.from(await response.arrayBuffer())).toString()).toBe(
    '<main>Hello</main>',
  );
});
test('respects excluded encodings, existing compression and non-HTML bytes', async () => {
  for (const encoding of ['', 'gzip;q=0', 'br']) {
    const response = compressHtml(
      request(encoding),
      new Response('hello', { headers: { 'Content-Type': 'text/html' } }),
    );
    expect(response.headers.get('Content-Encoding')).toBeNull();
    expect(await response.text()).toBe('hello');
  }
  const original = new Response('signed bytes', {
    headers: { 'Content-Type': 'application/octet-stream' },
  });
  expect(compressHtml(request('gzip'), original)).toBe(original);
});
test('flushes primary HTML before a slow activity section completes', async () => {
  let finish!: () => void;
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('<main>Primary</main>'));
      finish = () => {
        controller.enqueue(new TextEncoder().encode('<aside>Activity</aside>'));
        controller.close();
      };
    },
  });
  const response = compressHtml(
    request('gzip'),
    new Response(body, { headers: { 'Content-Type': 'text/html' } }),
  );
  const reader = response
    .body!.pipeThrough(new DecompressionStream('gzip'))
    .getReader();
  const first = await Promise.race([
    reader.read(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('HTML was buffered')), 1000),
    ),
  ]);
  expect(new TextDecoder().decode(first.value)).toBe('<main>Primary</main>');
  finish();
  while (!(await reader.read()).done) {}
});

test('a failed HTML producer rejects the response instead of escaping as a process error', async () => {
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.error(new Error('HTML producer failed'));
    },
  });
  const response = compressHtml(
    request('gzip'),
    new Response(body, { headers: { 'Content-Type': 'text/html' } }),
  );
  await expect(response.arrayBuffer()).rejects.toThrow('HTML producer failed');
});

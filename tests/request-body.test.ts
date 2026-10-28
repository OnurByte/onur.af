import { expect, test } from 'bun:test';
import {
  readRequestBody,
  RequestBodyTooLarge,
} from '../src/server/request-body';

function request(body: ReadableStream<Uint8Array>) {
  return new Request('https://portfolio.example/test', {
    method: 'POST',
    body,
  });
}

test('bounded bodies preserve split UTF-8 bytes and allow the exact limit', async () => {
  const bytes = new TextEncoder().encode('⟐ Log');
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes.slice(0, 1));
      controller.enqueue(bytes.slice(1));
      controller.close();
    },
  });
  const result = await readRequestBody(request(body), bytes.length);
  expect(result).toEqual(bytes);
  expect(body.locked).toBe(false);
});

test('bounded bodies distinguish a missing body from an empty stream', async () => {
  expect(
    await readRequestBody(new Request('https://portfolio.example/test'), 8),
  ).toBeNull();
  expect(
    await readRequestBody(
      request(
        new ReadableStream({
          start(controller) {
            controller.close();
          },
        }),
      ),
      8,
    ),
  ).toEqual(new Uint8Array());
});

test('chunked overflow cancels immediately even when Content-Length understates it', async () => {
  let canceled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(3));
      controller.enqueue(new Uint8Array(3));
    },
    cancel() {
      canceled = true;
    },
  });
  const input = request(body);
  input.headers.set('Content-Length', '1');
  expect(
    await readRequestBody(input, 5).catch((error: unknown) => error),
  ).toBeInstanceOf(RequestBodyTooLarge);
  expect(canceled).toBe(true);
  expect(body.locked).toBe(false);
});

test('stream failures propagate and release the reader lock', async () => {
  const failure = new Error('Fixture stream failed');
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.error(failure);
    },
  });
  expect(
    await readRequestBody(request(body), 8).catch((error: unknown) => error),
  ).toBe(failure);
  expect(body.locked).toBe(false);
});

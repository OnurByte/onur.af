import { Readable, pipeline } from 'node:stream';
import { constants, createGzip } from 'node:zlib';

/** Standalone Node has no CDN compression; flush each chunk to preserve SSR streaming. */
export function compressHtml(
  request: Request,
  response: Response,
  onError?: (error: Error) => void,
): Response {
  if (
    request.method !== 'GET' ||
    response.status !== 200 ||
    !response.body ||
    !response.headers.get('Content-Type')?.includes('text/html') ||
    response.headers.has('Content-Encoding') ||
    /\bno-transform\b/i.test(response.headers.get('Cache-Control') ?? '')
  )
    return response;

  const headers = new Headers(response.headers);
  const vary = headers.get('Vary');
  if (
    !vary
      ?.split(',')
      .some((value) => value.trim().toLowerCase() === 'accept-encoding')
  )
    headers.set('Vary', vary ? `${vary}, Accept-Encoding` : 'Accept-Encoding');
  const gzip = (request.headers.get('Accept-Encoding') ?? '')
    .split(',')
    .some((value) => {
      const [name, ...parameters] = value.trim().split(';');
      if (name?.trim().toLowerCase() !== 'gzip') return false;
      const quality = parameters.find((parameter) =>
        parameter.trim().startsWith('q='),
      );
      return quality === undefined || Number(quality.trim().slice(2)) > 0;
    });
  if (!gzip)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

  headers.set('Content-Encoding', 'gzip');
  headers.delete('Content-Length');
  headers.delete('ETag');
  // Node and Bun declare different extra Web Stream helpers; the standard stream
  // protocol is shared, and the transport stays byte-for-byte reversible.
  const input = response.body as unknown as Parameters<
    typeof Readable.fromWeb
  >[0];
  const output = createGzip({ flush: constants.Z_SYNC_FLUSH });
  // Pipeline propagates producer errors and consumer cancellation across both
  // streams; the Web Stream carries any failure to the HTTP response consumer.
  pipeline(Readable.fromWeb(input), output, (error) => {
    if (
      error &&
      error.code !== 'ERR_STREAM_PREMATURE_CLOSE' &&
      error.code !== 'ABORT_ERR'
    )
      onError?.(error);
  });
  const body = Readable.toWeb(output) as unknown as ReadableStream<Uint8Array>;
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

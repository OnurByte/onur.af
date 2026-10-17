/** Dynamic payment responses must never be reused by a browser or proxy. */
export function jsonNoStore(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
}

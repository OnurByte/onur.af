/** Dynamic payment responses must never be reused by a browser or proxy. */
export function jsonNoStore(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
}

/** JSON API responses with explicit caching and content sniffing protection. */
export function jsonResponse(
  value: unknown,
  status = 200,
  publicCache = false,
): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': publicCache
        ? 'public, max-age=60, stale-while-revalidate=120'
        : 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

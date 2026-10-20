import { publicPreview } from './previews';
import { validSiteUrl } from './seo';

export function oembedResponse(
  origin: string | undefined,
  request: URL,
): Response {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Robots-Tag': 'noindex',
    'Cache-Control': 'no-store',
  };
  const error = (status: number) =>
    new Response(JSON.stringify({ error: status }), { status, headers });
  if (!origin || validSiteUrl(origin) !== origin) return error(503);
  const format = request.searchParams.get('format');
  if (format !== null && format !== 'json') return error(501);
  const value = request.searchParams.get('url');
  if (!value || /[\u0000-\u0020\u007f\\]/.test(value)) return error(404);
  let target: URL;
  try {
    target = new URL(value);
  } catch {
    return error(404);
  }
  if (
    target.origin !== origin ||
    target.username ||
    target.password ||
    target.search ||
    target.hash
  )
    return error(404);
  const preview = publicPreview(target.pathname);
  if (!preview) return error(404);

  const limits = ['maxwidth', 'maxheight'].map((key) => {
    const value = request.searchParams.get(key);
    return value === null
      ? Infinity
      : /^\d+$/.test(value)
        ? Number(value)
        : NaN;
  });
  if (limits.some((limit) => Number.isNaN(limit) || limit <= 0))
    return error(404);
  const size =
    Math.min(...limits) >= 512 ? 512 : Math.min(...limits) >= 180 ? 180 : 0;
  const { title, description } = preview;
  return new Response(
    JSON.stringify({
      version: '1.0',
      type: 'link',
      provider_name: 'Onur',
      provider_url: `${origin}/`,
      author_name: 'Onur',
      author_url: `${origin}/`,
      ...(target.pathname === '/'
        ? {}
        : { title: `${title} ⁜ Onur`, description }),
      ...(size
        ? {
            thumbnail_url: `${origin}/brand/${size === 512 ? 'icon.png' : 'apple-touch-icon.png'}`,
            thumbnail_width: size,
            thumbnail_height: size,
          }
        : {}),
    }),
    { headers: { ...headers, 'Cache-Control': 'public, max-age=300' } },
  );
}

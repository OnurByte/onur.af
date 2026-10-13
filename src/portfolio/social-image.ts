import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import assets from './fonts/card-assets.json';
import { mottos, publicPreview } from './previews';
import { publicPaths } from './seo';

let fonts: Promise<{ regular: string; bold: string }> | undefined;
function cardFonts() {
  return (fonts ??= (async () => {
    // Bundle font bytes so server rendering never depends on host fonts.
    const directory = await mkdtemp(join(tmpdir(), 'portfolio-card-'));
    const regular = join(directory, 'LiberationSans-Regular.ttf');
    const bold = join(directory, 'LiberationSans-Bold.ttf');
    await Promise.all([
      writeFile(regular, Buffer.from(assets.regular, 'base64')),
      writeFile(bold, Buffer.from(assets.bold, 'base64')),
    ]);
    return { regular, bold };
  })());
}

const escapeMarkup = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

export async function socialImage(page: string, mottoIndex = 0) {
  const preview = publicPaths
    .map(publicPreview)
    .find((entry) => entry?.key === page);
  if (!preview) throw new RangeError('Unknown public page');
  if (
    !Number.isInteger(mottoIndex) ||
    mottoIndex < 0 ||
    mottoIndex >= mottos.length
  )
    throw new RangeError('Invalid motto');
  const font = await cardFonts();
  const text = async (
    value: string,
    size: number,
    bold = false,
    width = 1056,
    height?: number,
  ) => {
    return sharp({
      text: {
        text: `<span foreground="#ffffff">${escapeMarkup(value)}</span>`,
        font: `Liberation Sans${bold ? ' Bold' : ''} ${size}`,
        fontfile: bold ? font.bold : font.regular,
        width,
        ...(height ? { height } : { dpi: 72 }),
        rgba: true,
        wrap: 'word',
      },
    })
      .png()
      .toBuffer();
  };
  const isHome = preview.key === 'home';
  const [logo, motto, name, title, description] = await Promise.all([
    sharp(Buffer.from(assets.logo))
      .resize(64, 64, { fit: 'contain' })
      .png()
      .toBuffer(),
    isHome ? undefined : text(mottos[mottoIndex]!, 19, false, 930),
    text('Onur', 28),
    text(isHome ? mottos[mottoIndex]! : preview.title, 96, true, 1056, 145),
    preview.description
      ? text(preview.description, 28, false, 1000)
      : undefined,
  ]);
  return sharp({
    create: { width: 1200, height: 630, channels: 3, background: '#000000' },
  })
    .composite([
      { input: logo, left: 72, top: 55 },
      { input: name, left: 162, top: 57 },
      ...(motto ? [{ input: motto, left: 162, top: 99 }] : []),
      {
        input: Buffer.from(
          '<svg width="1056" height="1"><path d="M0 .5H1056" stroke="#fff"/></svg>',
        ),
        left: 72,
        top: 165,
      },
      { input: title, left: 72, top: 220 },
      ...(description ? [{ input: description, left: 76, top: 418 }] : []),
    ])
    .png()
    .toBuffer();
}

export async function socialImageResponse(page: string | undefined, url: URL) {
  if (!publicPaths.some((path) => publicPreview(path)?.key === page))
    return new Response('Not found', { status: 404 });
  const indices = url.searchParams.getAll('m');
  if (indices.length > 1 || (indices.length && !/^[0-2]$/.test(indices[0]!)))
    return new Response('Invalid motto', { status: 400 });
  const png = await socialImage(page!, Number(indices[0] ?? 0));
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex',
    },
  });
}

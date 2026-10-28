import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { logSigilSvg } from './log-sigil-svg';
import assets from './fonts/card-assets.json';
import { mottos, publicPreviewByKey } from './previews';
import { isIndexableRobots, robotsContent } from './seo';

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

// Keys are restricted to bundled public previews and three motto variants.
// Share in-flight work as well as completed renders within this deployment.
const renderedCards = new Map<string, Promise<Buffer>>();
export async function socialImage(
  page: string,
  mottoIndex = 0,
  revision?: number,
) {
  const preview = publicPreviewByKey(page, revision);
  if (!preview) throw new RangeError('Unknown public page');
  if (
    !Number.isInteger(mottoIndex) ||
    mottoIndex < 0 ||
    mottoIndex >= mottos.length
  )
    throw new RangeError('Invalid motto');
  const key = `${page}:${String(mottoIndex)}:${'revision' in preview ? String(preview.revision) : ''}`;
  let result = renderedCards.get(key);
  if (!result) {
    result = renderSocialImage(preview, mottoIndex).catch((error) => {
      renderedCards.delete(key);
      throw error;
    });
    renderedCards.set(key, result);
  }
  return result;
}

async function renderSocialImage(
  preview: NonNullable<ReturnType<typeof publicPreviewByKey>>,
  mottoIndex: number,
) {
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
  const sealId = preview.key.startsWith('log-')
    ? preview.key.slice(4)
    : preview.key.startsWith('verified-')
      ? preview.key.slice(9)
      : undefined;
  const seal = sealId
    ? await sharp(Buffer.from(logSigilSvg(sealId, '#fff')))
        .resize(240, 240)
        .png()
        .toBuffer()
    : undefined;
  const isHome = preview.key === 'home';
  const cardTitleCharacters = Array.from(preview.title);
  const cardTitle =
    cardTitleCharacters.length > 64
      ? `${cardTitleCharacters.slice(0, 63).join('')}…`
      : preview.title;
  const titleSize = !isHome && Array.from(cardTitle).length > 36 ? 60 : 96;
  const [logo, motto, name, title, description] = await Promise.all([
    sharp(Buffer.from(assets.logo))
      .resize(64, 64, { fit: 'contain' })
      .png()
      .toBuffer(),
    isHome ? undefined : text(mottos[mottoIndex]!, 19, false, 930),
    text('Onur', isHome ? 64 : 28),
    text(
      isHome ? mottos[mottoIndex]! : cardTitle,
      titleSize,
      true,
      seal ? 744 : 1056,
      145,
    ),
    preview.description
      ? text(
          preview.description,
          28,
          false,
          seal ? 744 : 1000,
          seal ? 135 : undefined,
        )
      : undefined,
  ]);
  const logoBounds = isHome
    ? (await sharp(logo).trim().toBuffer({ resolveWithObject: true })).info
    : undefined;
  const brandName = logoBounds
    ? await sharp(name).resize({ height: logoBounds.height }).png().toBuffer()
    : name;
  return sharp({
    create: { width: 1200, height: 630, channels: 3, background: '#000000' },
  })
    .composite([
      { input: logo, left: 72, top: 55 },
      {
        input: brandName,
        left: 162,
        top: logoBounds ? 55 - (logoBounds.trimOffsetTop ?? 0) : 57,
      },
      ...(motto ? [{ input: motto, left: 162, top: 99 }] : []),
      {
        input: Buffer.from(
          '<svg width="1056" height="1"><path d="M0 .5H1056" stroke="#fff"/></svg>',
        ),
        left: 72,
        top: 165,
      },
      { input: title, left: 72, top: 220 },
      ...(seal ? [{ input: seal, left: 888, top: 220 }] : []),
      ...(description ? [{ input: description, left: 76, top: 418 }] : []),
    ])
    .png()
    .toBuffer();
}

export async function socialImageResponse(page: string | undefined, url: URL) {
  if (!page || !publicPreviewByKey(page))
    return new Response('Not found', { status: 404 });
  const indices = url.searchParams.getAll('m');
  if (indices.length > 1 || (indices.length && !/^[0-2]$/.test(indices[0]!)))
    return new Response('Invalid motto', { status: 400 });
  const revisions = url.searchParams.getAll('r');
  const initial = publicPreviewByKey(page);
  if (
    revisions.length > 1 ||
    (revisions.length &&
      (!/^[1-9][0-9]*$/.test(revisions[0]!) ||
        !initial ||
        !('revision' in initial)))
  )
    return new Response('Invalid revision', { status: 400 });
  const revision = revisions.length ? Number(revisions[0]) : undefined;
  const preview = publicPreviewByKey(page, revision);
  if (!preview) return new Response('Not found', { status: 404 });
  const png = await socialImage(page, Number(indices[0] ?? 0), revision);
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      ...(isIndexableRobots(robotsContent(preview.id))
        ? {}
        : { 'X-Robots-Tag': 'noindex' }),
    },
  });
}

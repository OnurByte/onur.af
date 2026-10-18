import sharp from 'sharp';
import { contentIndex } from '../src/portfolio/content-index';
import { searchLogEntries } from '../src/portfolio/search';
import { socialImage } from '../src/portfolio/social-image';
import { logSigilSvg } from '../src/portfolio/log-sigil-svg';
import { publicPreview } from '../src/portfolio/previews';

for (const document of contentIndex.documents) {
  const search = searchLogEntries.find((item) => item.url === document.url);
  const preview = publicPreview(document.url);
  if (
    !search ||
    search.meta.title !== document.title ||
    preview?.title !== document.title
  )
    throw new Error(`Derived metadata mismatch: ${document.id}`);
  const sigil = await sharp(Buffer.from(logSigilSvg(document.id, '#fff')))
    .png()
    .toBuffer();
  const sigilMetadata = await sharp(sigil).metadata();
  const image = await socialImage(`log-${document.id}`);
  const imageMetadata = await sharp(image).metadata();
  if (
    sigilMetadata.width !== 160 ||
    sigilMetadata.height !== 160 ||
    imageMetadata.width !== 1200 ||
    imageMetadata.height !== 630
  )
    throw new Error(`Invalid derived visual dimensions: ${document.id}`);
}
console.log(
  `Validated search, sigils and social images for ${contentIndex.documents.length} current Log revisions.`,
);

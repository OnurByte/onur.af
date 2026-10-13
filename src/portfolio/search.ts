import { publicPreview } from './previews';

// Fixed public metadata only: never crawl checkout URLs or payment data.
export const searchPages = ['/', '/donate', '/rss', '/pgp'].map((url) => {
  const preview = publicPreview(url)!;
  return {
    url,
    content: `${preview.title}. ${preview.description}`,
    language: 'en',
    meta: { title: preview.title, description: preview.description },
  };
});

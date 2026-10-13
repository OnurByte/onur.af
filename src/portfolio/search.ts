import { publicPreview } from './previews';

// Fixed public metadata only: never crawl checkout URLs or payment data.
export const searchPages = [
  { url: '/', description: 'Back to the homepage.' },
  { url: '/donate', description: 'Support my work with Monero.' },
  { url: '/rss', description: 'Follow new writing.' },
  {
    url: '/pgp',
    description: 'Public key for encrypted messages and signatures.',
  },
].map(({ url, description }) => {
  const preview = publicPreview(url)!;
  return {
    url,
    content: `${preview.title}. ${preview.description}`,
    language: 'en',
    meta: { title: preview.title, description },
  };
});

import pages from '../content/public-pages.json';

// Fixed public metadata only: never crawl checkout URLs or payment data.
export const searchPages = pages.map(({ id, title, description }) => ({
  url: id,
  meta: { title, description },
}));

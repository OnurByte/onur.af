import { siteDescription } from './seo';

export const mottos = [
  'The creator originates.',
  'I am. I think. I will.',
  'To think is an act of choice.',
] as const;

const pages: Record<
  string,
  { key: string; title: string; description: string }
> = {
  '/': {
    key: 'home',
    title: 'Home',
    description: siteDescription,
  },
  '/donate': {
    key: 'donate',
    title: 'Donate',
    description: 'Support my work with Monero.',
  },
  '/rss': {
    key: 'rss',
    title: 'RSS',
    description:
      'RSS brings new writing to your feed reader. Add this address to subscribe.',
  },
  '/pgp': {
    key: 'pgp',
    title: 'PGP',
    description:
      'My public key for encrypted messages and signature verification.',
  },
};

export function publicPreview(pathname: string) {
  return pages[pathname];
}

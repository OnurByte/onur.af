import pages from '../content/public-pages.json' with { type: 'json' };

export const socialImageVersion = '2';

export const mottos = [
  'The creator originates.',
  'I am. I think. I will.',
  'To think is an act of choice.',
] as const;

export function publicPreview(pathname: string) {
  return pages.find((page) => page.id === pathname);
}

export const scrollProfiles = {
  home: 180,
  log: 100,
  article: 220,
  pgp: 130,
  rss: 150,
  contribute: 70,
  utility: 110,
} as const;

export function scrollProfileForPath(
  path: string,
): keyof typeof scrollProfiles {
  const pathname = path.replace(/\/+$/, '') || '/';
  if (pathname === '/') return 'home';
  if (pathname === '/log' || pathname.startsWith('/log/tag/')) return 'log';
  if (pathname.startsWith('/log/')) return 'article';
  if (pathname === '/pgp' || pathname.startsWith('/pgp/')) return 'pgp';
  if (pathname === '/rss') return 'rss';
  if (pathname === '/contribute' || pathname.startsWith('/contribute/'))
    return 'contribute';
  return 'utility';
}

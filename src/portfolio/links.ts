type LinkName = 'TOR' | 'I2P' | 'PGP';
type PortfolioLink = { label: LinkName; href?: string };

const env = (key: string) => process.env[key] ?? import.meta.env?.[key];

export function validPortfolioUrl(
  label: LinkName,
  value: string,
): string | undefined {
  if (!value || /[\u0000-\u001f\u007f\\]/.test(value)) return;
  if (label === 'PGP' && value.startsWith('/') && !value.startsWith('//'))
    return value;

  try {
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return;
    const hostname = url.hostname.toLowerCase();
    if (label === 'TOR' && hostname.endsWith('.onion')) return url.href;
    if (label === 'I2P' && hostname.endsWith('.i2p')) return url.href;
    if (label === 'PGP' && url.protocol === 'https:') return url.href;
  } catch {
    return;
  }
}

export function portfolioLinks(): PortfolioLink[] {
  return (['TOR', 'I2P', 'PGP'] as const).map((label) => {
    const key = `PORTFOLIO_${label}_URL`;
    const href = validPortfolioUrl(label, env(key) ?? '');
    return { label, href };
  });
}

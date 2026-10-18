import * as stylex from '@stylexjs/stylex';

export const proof = stylex.create({
  identity: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
    minHeight: 24,
    lineHeight: '24px',
  },
  badge: {
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    verticalAlign: 'middle',
    fontSize: 'var(--font-small, 0.875rem)',
    fontWeight: 400,
    lineHeight: '24px',
    color: 'var(--muted)',
    borderRadius: 'var(--radius-control, 8px)',
    ':hover': { backgroundColor: 'var(--surface)', color: 'var(--text)' },
    ':focus-visible': { outline: '2px solid var(--text)', outlineOffset: 3 },
  },
  labeled: { gap: 4, width: 'auto', whiteSpace: 'nowrap' },
});

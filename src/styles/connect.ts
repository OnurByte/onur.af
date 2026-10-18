import * as stylex from '@stylexjs/stylex';

export const connect = stylex.create({
  section: { gridColumn: '1 / -1' },
  list: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      '@media (min-width: 521px)': 'repeat(2, minmax(0, 1fr))',
      '@media (min-width: 1101px)': 'repeat(4, minmax(0, 1fr))',
    },
    gap: 'var(--space-4, 16px)',
    marginTop: 'var(--space-4, 16px)',
    padding: 0,
    listStyle: 'none',
  },
  item: { minWidth: 0, scrollMarginBlock: 24 },
  link: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    height: '100%',
    minHeight: 76,
    padding: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--border)',
    borderRadius: 'var(--radius-control, 8px)',
  },
  interactive: {
    '--edge-fill': {
      default: 'var(--background)',
      ':focus-within': 'var(--surface)',
      '@media (hover: hover) and (pointer: fine)': {
        ':hover': 'var(--surface)',
      },
    },
    '--edge-line': 'var(--border)',
    transitionProperty: {
      default: 'none',
      '@media (prefers-reduced-motion: no-preference)': 'background-color',
    },
    transitionDuration: '160ms',
    transitionTimingFunction: 'ease-out',
  },
  heading: {
    display: 'flex',
    flexShrink: 0,
    alignItems: 'center',
    gap: 8,
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  copy: { minWidth: 0, textAlign: 'right' },
  accountRow: { position: 'relative' },
  accountLink: {
    whiteSpace: 'nowrap',
    '::after': { content: '""', position: 'absolute', inset: 0 },
    ':focus-visible': { outline: 'none' },
    ':focus-visible::after': {
      outline: '2px solid var(--text)',
      outlineOffset: 3,
      borderRadius: 'var(--radius-control, 8px)',
    },
  },
  proof: { position: 'relative', zIndex: 1, flexShrink: 0, display: 'flex' },
  detail: {
    display: 'block',
    minHeight: 24,
    fontSize: 'var(--font-small, 0.875rem)',
    lineHeight: '24px',
    color: 'var(--muted)',
    overflowWrap: 'anywhere',
  },
  unpublished: {
    ':hover': { backgroundColor: 'transparent' },
  },
});

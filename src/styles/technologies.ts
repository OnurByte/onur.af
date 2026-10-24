import * as stylex from '@stylexjs/stylex';

export const technologies = stylex.create({
  section: { marginTop: 'var(--section-space)' },
  categories: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      '@media (min-width: 621px)': 'repeat(2, minmax(0, 1fr))',
    },
    gap: 'var(--space-4)',
    marginTop: 'var(--space-6)',
  },
  categoryHeading: {
    color: 'var(--muted)',
    fontSize: 'var(--font-small)',
    fontWeight: 500,
    lineHeight: 'var(--leading-body)',
  },
  names: {
    display: 'flex',
    flexWrap: 'wrap',
    columnGap: 12,
    rowGap: 4,
    listStyle: 'none',
    padding: 0,
    marginTop: 4,
    fontSize: 'var(--font-body)',
    lineHeight: 'var(--leading-body)',
    overflowWrap: 'anywhere',
  },
  name: { display: 'inline-flex', alignItems: 'center', gap: 4 },
});

import * as stylex from '@stylexjs/stylex';

export const technologies = stylex.create({
  section: { marginTop: 'var(--section-space)' },
  categories: {
    display: 'grid',
    gap: 'var(--space-6)',
    marginTop: 'var(--space-6)',
  },
  categoryHeading: {
    color: 'var(--muted)',
    fontSize: 'var(--font-small)',
    fontWeight: 500,
    lineHeight: 'var(--leading-body)',
  },
  list: {
    marginTop: 'var(--space-3)',
    gridTemplateColumns: {
      default: 'repeat(2, minmax(0, 1fr))',
      '@media (min-width: 621px)': 'repeat(3, minmax(0, 1fr))',
      '@media (min-width: 1101px)': 'repeat(4, minmax(0, 1fr))',
    },
  },
  card: { justifyContent: 'flex-start', gap: 12 },
  name: {
    minWidth: 0,
    overflowWrap: 'anywhere',
    fontSize: 'var(--font-body)',
    lineHeight: 1.4,
    fontWeight: 500,
  },
});

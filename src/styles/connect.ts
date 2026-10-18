import * as stylex from '@stylexjs/stylex';

export const connect = stylex.create({
  section: {
    gridColumn: '1 / -1',
    paddingInline: {
      default: 'var(--space-6, 24px)',
      '@media (min-width: 621px)': 'var(--space-10, 40px)',
    },
  },
  list: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    columnGap: 'var(--space-4, 16px)',
    rowGap: 'var(--space-4, 16px)',
    marginTop: 'var(--space-4, 16px)',
    padding: 0,
    listStyle: 'none',
  },
  item: { minWidth: 0, maxWidth: '100%', flex: '0 0 auto' },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3, 12px)',
    width: '100%',
    minHeight: 72,
    paddingInline: 'var(--space-4, 16px)',
    paddingBlock: 'var(--space-3, 12px)',
    borderRadius: 'var(--radius-control, 4px)',
    ':hover': { backgroundColor: 'var(--surface)' },
  },
  copy: { display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 },
  accountRow: { position: 'relative' },
  identity: { display: 'flex', alignItems: 'center', gap: 4 },
  accountLink: {
    whiteSpace: 'nowrap',
    flexShrink: 0,
    '::after': { content: '""', position: 'absolute', inset: 0 },
  },
  proof: { position: 'relative', zIndex: 1, flexShrink: 0 },
  detail: {
    fontSize: 'var(--font-small, 0.875rem)',
    lineHeight: 1.6,
    color: 'var(--muted)',
    overflowWrap: 'anywhere',
  },
  unpublished: {
    color: 'var(--muted)',
    ':hover': { backgroundColor: 'transparent' },
  },
});

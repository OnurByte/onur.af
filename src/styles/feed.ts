import * as stylex from '@stylexjs/stylex';

export const feedStyles = stylex.create({
  section: { marginTop: 'var(--section-space)' },
  heading: {
    fontSize: 'var(--font-subheading)',
    fontWeight: 'var(--weight-heading)',
    lineHeight: 'var(--leading-heading)',
  },
  paragraph: { marginTop: 'var(--space-4)', lineHeight: 'var(--leading-body)' },
  links: {
    marginTop: 'var(--space-4)',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
  },
  list: { margin: 0, padding: 0, listStyle: 'none' },
  entry: {
    marginTop: 'var(--space-6)',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: 'var(--border)',
  },
  entryTitle: {
    fontSize: 'var(--font-item-title)',
    fontWeight: 'var(--weight-heading)',
    overflowWrap: 'anywhere',
  },
  date: {
    display: 'block',
    marginTop: 'var(--space-2)',
    fontSize: 'var(--font-small)',
    color: 'var(--muted)',
  },
  summary: {
    marginTop: 'var(--space-2)',
    lineHeight: 'var(--leading-body)',
    overflowWrap: 'anywhere',
  },
  command: {
    marginTop: 'var(--space-4)',
    fontFamily: 'monospace',
    fontSize: 'var(--font-small)',
    lineHeight: 'var(--leading-body)',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
});

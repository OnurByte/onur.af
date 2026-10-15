import * as stylex from '@stylexjs/stylex';

export const feedStyles = stylex.create({
  section: { marginTop: 40 },
  heading: { fontSize: '1.25rem', fontWeight: 400, lineHeight: 1.4 },
  paragraph: { marginTop: 16, lineHeight: 1.7 },
  links: { marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 16 },
  list: { margin: 0, padding: 0, listStyle: 'none' },
  entry: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: 'var(--border)',
  },
  entryTitle: {
    fontSize: '1.125rem',
    fontWeight: 400,
    overflowWrap: 'anywhere',
  },
  date: {
    display: 'block',
    marginTop: 8,
    fontSize: '0.875rem',
    color: 'var(--muted)',
  },
  summary: { marginTop: 8, lineHeight: 1.7, overflowWrap: 'anywhere' },
  command: {
    marginTop: 16,
    fontFamily: 'monospace',
    fontSize: '0.875rem',
    lineHeight: 1.7,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
});

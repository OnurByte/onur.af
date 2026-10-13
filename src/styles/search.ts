import * as stylex from '@stylexjs/stylex';

export const searchStyles = stylex.create({
  form: {
    display: 'grid',
    gap: 12,
    maxWidth: 480,
    justifyItems: 'stretch',
  },
  results: {
    paddingLeft: 24,
    lineHeight: 1.8,
    overflowWrap: 'anywhere',
  },
});

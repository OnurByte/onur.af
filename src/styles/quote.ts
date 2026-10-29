import * as stylex from '@stylexjs/stylex';
export const quoteStyles = stylex.create({
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  },
  toolbar: {
    position: 'fixed',
    left: 'var(--annotation-x)',
    top: 'var(--annotation-y)',
    zIndex: 40,
    display: 'flex',
    gap: 0,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--border)',
    borderRadius: 'var(--radius-control)',
    backgroundColor: 'var(--background)',
    maxWidth: 'calc(100vw - 40px)',
  },
  action: {
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: { default: 'var(--background)', ':hover': 'var(--text)' },
    color: { default: 'var(--text)', ':hover': 'var(--background)' },
  },
  firstAction: {
    borderStartStartRadius: 'calc(var(--radius-control) - 1px)',
    borderEndStartRadius: 'calc(var(--radius-control) - 1px)',
  },
  lastAction: {
    borderStartEndRadius: 'calc(var(--radius-control) - 1px)',
    borderEndEndRadius: 'calc(var(--radius-control) - 1px)',
  },
  divider: {
    borderInlineStartWidth: 1,
    borderInlineStartStyle: 'solid',
    borderInlineStartColor: 'var(--border)',
  },
  iconButton: { minWidth: 44, minHeight: 44, padding: 10 },
});

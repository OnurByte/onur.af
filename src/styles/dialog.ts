import * as stylex from '@stylexjs/stylex';
export const dialogStyles = stylex.create({
  dialog: {
    margin: {
      default: '8svh auto auto',
      '@media (min-width: 621px)': '14svh auto auto',
    },
    width: {
      default: 'calc(100% - 24px)',
      '@media (min-width: 621px)': 'calc(100% - 40px)',
    },
    maxWidth: 640,
    maxHeight: { default: '84svh', '@media (min-width: 621px)': '72svh' },
    padding: 0,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--border)',
    borderRadius: 'var(--radius-card, 12px)',
    backgroundColor: 'var(--background)',
    color: 'var(--text)',
    '--dialog-height': {
      default: '84svh',
      '@media (min-width: 621px)': '72svh',
    },
    overflowY: 'hidden',
    '::backdrop': { backgroundColor: 'rgba(0,0,0,0.45)' },
  },
  accessibleClose: {
    position: 'absolute',
    width: { default: 1, ':focus': 'auto' },
    height: { default: 1, ':focus': 'auto' },
    overflow: { default: 'hidden', ':focus': 'visible' },
    clipPath: { default: 'inset(50%)', ':focus': 'none' },
    top: 8,
    right: 8,
    padding: { default: 0, ':focus': 8 },
    backgroundColor: 'var(--background)',
    zIndex: 1,
  },
});

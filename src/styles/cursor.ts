import * as stylex from '@stylexjs/stylex';

export const cursorStyles = stylex.create({
  ring: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: 24,
    height: 24,
    margin: 0,
    padding: 0,
    overflow: 'visible',
    borderWidth: 'var(--cursor-border-width, 0px)',
    borderStyle: 'solid',
    borderColor: 'var(--cursor-border-color, var(--text))',
    borderRadius: '50%',
    backgroundColor: 'var(--cursor-fill, #fff)',
    mixBlendMode: 'difference',
    pointerEvents: 'none',
    zIndex: 1000,
    opacity: 0,
    transform: 'translate(-50%, -50%)',
    transitionProperty: 'width, height',
    transitionDuration: '100ms',
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '0s' },
    forcedColorAdjust: 'none',
    '@media (any-hover: none)': { display: 'none' },
  },
});

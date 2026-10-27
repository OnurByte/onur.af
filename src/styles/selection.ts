import * as stylex from '@stylexjs/stylex';
export const selectionStyles = stylex.create({
  layer: {
    position: 'fixed',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 25,
    mixBlendMode: 'difference',
    overflow: 'hidden',
  },
});

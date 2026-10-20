import * as stylex from '@stylexjs/stylex';

export const localScroll = stylex.create({
  viewport: {
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    maxHeight: 'calc(var(--dialog-height) - 2px)',
    paddingRight: 12,
  },
  track: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    right: 0,
    width: 12,
    zIndex: 2,
    touchAction: 'none',
    cursor: 'pointer',
    borderRadius: 'var(--radius-control)',
  },
  thumb: {
    display: 'block',
    position: 'absolute',
    left: 4,
    right: 4,
    height: 'var(--local-thumb-size, 32px)',
    transform: 'translateY(var(--local-thumb-top, 0px))',
    borderRadius: 'var(--radius-control)',
    backgroundColor: 'var(--muted)',
    opacity: 0.65,
    pointerEvents: 'none',
    '@media (forced-colors: active)': { backgroundColor: 'ButtonText' },
  },
});

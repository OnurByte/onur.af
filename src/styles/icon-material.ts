import * as stylex from '@stylexjs/stylex';

/** Static light from the upper left; the shadow follows the SVG alpha. */
export const iconMaterial = stylex.create({
  depth: {
    filter: {
      default:
        'drop-shadow(0 0.65px 0 rgb(0 0 0 / 0.38)) drop-shadow(0.5px 1.5px 1.2px rgb(0 0 0 / 0.18))',
      '@media (prefers-color-scheme: dark)':
        'drop-shadow(-0.25px -0.35px 0 rgb(255 255 255 / 0.3)) drop-shadow(0 0.75px 0 rgb(90 90 90 / 0.9)) drop-shadow(0.5px 1.5px 1.2px rgb(0 0 0 / 0.5))',
      '@media (prefers-contrast: more)': 'none',
      '@media (forced-colors: active)': 'none',
    },
  },
  face: {
    display: 'block',
    width: '100%',
    height: '100%',
    maskImage: 'var(--icon-source)',
    maskMode: 'alpha',
    maskSize: 'contain',
    maskPosition: 'center',
    maskRepeat: 'no-repeat',
    backgroundColor: 'var(--text)',
    backgroundImage: {
      default:
        'linear-gradient(145deg, #5a5a5a 0%, #282828 28%, #0d0d0d 58%, #242424 82%, #101010 100%)',
      '@media (prefers-color-scheme: dark)':
        'linear-gradient(145deg, #ffffff 0%, #f4f4f4 28%, #d8d8d8 58%, #b0b0b0 82%, #e0e0e0 100%)',
      '@media (prefers-contrast: more)': 'none',
      '@media (forced-colors: active)': 'none',
    },
    forcedColorAdjust: 'none',
    '@media (forced-colors: active)': {
      backgroundColor: 'CanvasText',
    },
  },
});

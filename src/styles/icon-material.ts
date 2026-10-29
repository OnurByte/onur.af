import * as stylex from '@stylexjs/stylex';

/** One upper-left light. cqmin follows the rendered icon's shorter side.
 * A single alpha shadow avoids recursively extruding earlier shadow layers.
 */
export const iconMaterial = stylex.create({
  depth: {
    display: 'block',
    width: '100%',
    height: '100%',
    filter: {
      default: 'drop-shadow(2cqmin 4cqmin 0.5cqmin rgb(0 0 0 / 0.8))',
      '@media (prefers-color-scheme: dark)':
        'drop-shadow(2cqmin 4cqmin 0.5cqmin rgb(96 96 96 / 0.95))',
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
      default: 'linear-gradient(135deg, #606060 0%, #0d0d0d 100%)',
      '@media (prefers-color-scheme: dark)':
        'linear-gradient(135deg, #ffffff 0%, #a0a0a0 100%)',
      '@media (prefers-contrast: more)': 'none',
      '@media (forced-colors: active)': 'none',
    },
    forcedColorAdjust: 'none',
    '@media (forced-colors: active)': {
      backgroundColor: 'CanvasText',
    },
  },
});

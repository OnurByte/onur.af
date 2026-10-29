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
      default: 'drop-shadow(0.75cqmin 1.5cqmin 1cqmin rgb(0 0 0 / 0.22))',
      '@media (prefers-color-scheme: dark)':
        'drop-shadow(0.75cqmin 1.5cqmin 1cqmin rgb(255 255 255 / 0.12))',
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
      default: 'linear-gradient(135deg, #242424 0%, #0d0d0d 100%)',
      '@media (prefers-color-scheme: dark)':
        'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)',
      '@media (prefers-contrast: more)': 'none',
      '@media (forced-colors: active)': 'none',
    },
    forcedColorAdjust: 'none',
    '@media (forced-colors: active)': {
      backgroundColor: 'CanvasText',
    },
  },
});

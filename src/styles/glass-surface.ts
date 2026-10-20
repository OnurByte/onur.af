import * as stylex from '@stylexjs/stylex';

export const glassSurface = stylex.create({
  material: {
    '::before': {
      content: '""',
      position: 'absolute',
      inset: 'var(--glass-inset, 0px)',
      pointerEvents: 'none',
      borderRadius: 'var(--radius-card)',
      backgroundColor: {
        default: 'var(--glass-fill, var(--background))',
        '@supports (backdrop-filter: blur(1px))':
          'var(--glass-fill, color-mix(in srgb, var(--background) 18%, transparent))',
        '@media (prefers-reduced-transparency: reduce)': 'var(--background)',
        '@media (prefers-contrast: more)': 'var(--background)',
      },
      backgroundImage:
        'linear-gradient(135deg, color-mix(in srgb, var(--text) 5%, transparent), transparent 35%, color-mix(in srgb, var(--text) 2%, transparent))',
      backdropFilter: {
        default: 'var(--glass-optics, blur(6px) grayscale(1))',
        '@media (prefers-reduced-transparency: reduce)': 'none',
        '@media (prefers-contrast: more)': 'none',
      },
    },
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 'var(--glass-inset, 0px)',
      pointerEvents: 'none',
      borderRadius: 'var(--radius-card)',
      backgroundImage:
        'radial-gradient(ellipse 45% 130% at var(--glass-light-x, 50%) var(--glass-light-y, 40%), rgb(255 255 255 / 4%), transparent 75%)',
      backgroundSize: '100% 100%',
      backgroundRepeat: 'no-repeat',
      opacity: {
        default: 'var(--glass-reflection, 1)',
        '@media (prefers-reduced-transparency: reduce)': 0,
        '@media (prefers-contrast: more)': 0,
      },
    },
  },
});

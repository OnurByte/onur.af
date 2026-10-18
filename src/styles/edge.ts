import * as stylex from '@stylexjs/stylex';

// Each radial field is anchored to this element's own corner, so the highlights
// scale with the surface without measuring or painting over interactive content.
export const edge = stylex.create({
  frame: {
    borderColor: {
      default: 'var(--border)',
      '@supports (background: color-mix(in srgb, black, white))': 'transparent',
    },
    backgroundOrigin: 'border-box',
    backgroundClip: 'padding-box, border-box, border-box',
    backgroundImage:
      'linear-gradient(var(--edge-fill, var(--background)), var(--edge-fill, var(--background))), radial-gradient(ellipse 50% 50% at 100% 0%, color-mix(in srgb, var(--text) 92%, var(--edge-line, var(--border))) 0%, color-mix(in srgb, var(--text) 45%, var(--edge-line, var(--border))) 50%, transparent 100%), radial-gradient(ellipse 50% 50% at 0% 100%, color-mix(in srgb, var(--text) 92%, var(--edge-line, var(--border))) 0%, color-mix(in srgb, var(--text) 45%, var(--edge-line, var(--border))) 50%, var(--edge-line, var(--border)) 100%)',
  },
});

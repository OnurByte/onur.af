import * as stylex from '@stylexjs/stylex';

const cornerLights =
  'radial-gradient(ellipse 50% 50% at 100% 0%, color-mix(in srgb, var(--text) 55%, var(--edge-line, var(--border))) 0%, transparent 100%), radial-gradient(ellipse 50% 50% at 0% 100%, color-mix(in srgb, var(--text) 55%, var(--edge-line, var(--border))) 0%, var(--edge-line, var(--border)) 100%)';

// Each corner light spans half of this element’s own width and height.
// Layered backgrounds follow the real border without clipping links or focus rings.
export const edge = stylex.create({
  frame: {
    borderColor: {
      default: 'var(--border)',
      '@supports (background: color-mix(in srgb, black, white))': 'transparent',
    },
    backgroundOrigin: 'border-box',
    backgroundClip: 'padding-box, border-box, border-box',
    backgroundImage: `linear-gradient(var(--edge-fill, var(--background)), var(--edge-fill, var(--background))), ${cornerLights}`,
  },
  ring: {
    padding: 1,
    backgroundImage: cornerLights,
    maskImage: 'linear-gradient(#fff 0 0), linear-gradient(#fff 0 0)',
    maskClip: 'content-box, border-box',
    maskOrigin: 'content-box, border-box',
    maskComposite: 'exclude',
    pointerEvents: 'none',
  },
});

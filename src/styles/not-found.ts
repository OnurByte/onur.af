import * as stylex from '@stylexjs/stylex';
const glitch = stylex.keyframes({
  '0%': { transform: 'translateX(0)' },
  '94%': { transform: 'translateX(0)' },
  '95%': { transform: 'translateX(-2px)' },
  '96%': { transform: 'translateX(2px)' },
  '97%': { transform: 'translateX(0)' },
  '100%': { transform: 'translateX(0)' },
});
export const notFound = stylex.create({
  main: {
    display: 'grid',
    placeItems: 'center',
    minHeight: '65svh',
    padding: '40px 20px',
  },
  scene: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    width: '100%',
    maxWidth: 640,
    minHeight: 340,
    textAlign: 'center',
    textDecoration: 'none',
    '::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      opacity: 0.06,
      backgroundImage:
        'repeating-linear-gradient(0deg,var(--text) 0px,var(--text) 1px,transparent 1px,transparent 3px)',
    },
  },
  code: {
    display: 'inline-block',
    fontSize: 'clamp(4rem,12vw,7rem)',
    lineHeight: 1,
    fontWeight: 500,
    letterSpacing: '-0.06em',
    padding: '4px 12px 8px',
    backgroundColor: 'var(--text)',
    color: 'var(--background)',
    animationName: glitch,
    animationDuration: '6s',
    animationIterationCount: 'infinite',
  },
  message: { fontSize: 20 },
  hint: { fontSize: 14, color: 'var(--muted)' },
});

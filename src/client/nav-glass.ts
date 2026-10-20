import { initGlassSurface } from './glass-surface';

export function initNavGlass() {
  const nav = document.querySelector<HTMLElement>('[data-nav-glass]');
  if (nav) initGlassSurface(nav, true);
}

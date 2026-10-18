import { createGlassField, glassMotion } from '../portfolio/glass-optics';

export function initNavGlass() {
  const nav = document.querySelector<HTMLElement>('[data-nav-glass]');
  if (!nav || nav.dataset['glassState']) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const opaque = matchMedia('(prefers-reduced-transparency: reduce)');
  const contrast = matchMedia('(prefers-contrast: more)');
  const chromium = /Chrome\//.test(navigator.userAgent);
  const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.style.cssText = 'position:absolute;pointer-events:none;overflow:hidden';
  const filter = document.createElementNS(ns, 'filter');
  const id = `nav-glass-${seed.toString(16)}`;
  filter.id = id;
  filter.setAttribute('filterUnits', 'userSpaceOnUse');
  filter.setAttribute('color-interpolation-filters', 'sRGB');
  const map = document.createElementNS(ns, 'feImage');
  map.setAttribute('result', 'lens');
  map.setAttribute('preserveAspectRatio', 'none');
  // 8-bit maps encode neutrality at 128, while SVG expects exactly 0.5.
  // This affine correction centers the plateau without a subpixel bias.
  const centered = document.createElementNS(ns, 'feComponentTransfer');
  centered.setAttribute('in', 'lens');
  centered.setAttribute('result', 'centered-lens');
  for (const channel of ['feFuncR', 'feFuncG']) {
    const curve = document.createElementNS(ns, channel);
    curve.setAttribute('type', 'linear');
    curve.setAttribute('slope', String(255 / 254));
    curve.setAttribute('intercept', String(-1 / 254));
    centered.append(curve);
  }
  const displace = document.createElementNS(ns, 'feDisplacementMap');
  displace.setAttribute('in', 'SourceGraphic');
  displace.setAttribute('in2', 'centered-lens');
  displace.setAttribute('xChannelSelector', 'R');
  displace.setAttribute('yChannelSelector', 'G');
  displace.setAttribute('scale', '9');
  filter.append(map, centered, displace);
  svg.append(filter);
  document.body.append(svg);

  let frame = 0,
    resizeFrame = 0,
    previous = 0,
    elapsed = 0;
  let velocity = 0,
    lastScroll = scrollY,
    hidden = false;
  let bounds = nav.getBoundingClientRect();
  let size = '';
  const blocked = () => opaque.matches || contrast.matches;
  const active = () =>
    !blocked() && !reduced.matches && !document.hidden && !hidden;
  const cancel = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    previous = 0;
  };

  const render = (time: number) => {
    frame = 0;
    if (!active()) return;
    const delta = previous ? time - previous : 34;
    if (delta >= 1000 / 30) {
      const dt = Math.min(delta, 100);
      previous = time;
      elapsed += dt;
      const smoothing = 1 - Math.exp(-dt / 180);
      const movement = scrollY - lastScroll;
      lastScroll = scrollY;
      velocity +=
        (Math.max(-1, Math.min(1, movement / dt / 2)) - velocity) * smoothing;
      const state = glassMotion(seed, elapsed, velocity);
      displace.setAttribute('scale', (state.strength * 12).toFixed(3));
      nav.style.setProperty('--glass-light-x', `${state.lightX.toFixed(1)}%`);
      nav.style.setProperty('--glass-light-y', `${state.lightY.toFixed(1)}%`);
    }
    frame = requestAnimationFrame(render);
  };
  const resume = () => {
    if (active() && !frame) {
      lastScroll = scrollY;
      frame = requestAnimationFrame(render);
    }
  };

  function rebuild() {
    resizeFrame = 0;
    if (!nav) return;
    bounds = nav.getBoundingClientRect();
    if (blocked()) {
      nav.style.removeProperty('--glass-optics');
      nav.dataset['glassState'] = 'opaque';
      cancel();
      return;
    }
    const width = Math.round(bounds.width + 24),
      height = Math.round(bounds.height + 8);
    if (width < 2 || width > 2048 || height < 2 || height > 256) return;
    const resolution = Math.min(2, Math.max(1, devicePixelRatio || 1));
    const key = `${width}:${height}:${resolution}`;
    if (key !== size) {
      const field = createGlassField(
        { width, height, radius: 12, resolution },
        seed,
      );
      const canvas = document.createElement('canvas');
      canvas.width = field.width;
      canvas.height = field.height;
      const context = canvas.getContext('2d');
      if (!context) return;
      const image = context.createImageData(field.width, field.height);
      image.data.set(field.displacement);
      context.putImageData(image, 0, 0);
      map.setAttribute('href', canvas.toDataURL());
      for (const element of [filter, map]) {
        element.setAttribute('x', '0');
        element.setAttribute('y', '0');
        element.setAttribute('width', String(width));
        element.setAttribute('height', String(height));
      }
      size = key;
    }
    if (chromium)
      nav.style.setProperty(
        '--glass-optics',
        `blur(6px) url("#${id}") grayscale(1)`,
      );
    nav.dataset['glassState'] = reduced.matches
      ? 'static'
      : chromium
        ? 'refractive'
        : 'reflective';
    if (reduced.matches) {
      cancel();
      displace.setAttribute('scale', '9');
      nav.style.removeProperty('--glass-light-x');
      nav.style.removeProperty('--glass-light-y');
    } else resume();
  }

  const observer = new ResizeObserver(() => {
    if (!resizeFrame) resizeFrame = requestAnimationFrame(rebuild);
  });
  observer.observe(nav);
  window.addEventListener(
    'resize',
    () => {
      if (!resizeFrame) resizeFrame = requestAnimationFrame(rebuild);
    },
    { passive: true },
  );
  for (const preference of [reduced, opaque, contrast])
    preference.addEventListener('change', () => {
      size = ''; // Recreate the lens when returning from the opaque preference.
      rebuild();
    });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancel();
    else resume();
  });
  window.addEventListener('pagehide', () => {
    hidden = true;
    cancel();
  });
  window.addEventListener('pageshow', () => {
    hidden = false;
    resume();
  });
  rebuild();
}

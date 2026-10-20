import { scrollProfiles, scrollProfileForPath } from '../portfolio/scroll';

let moveTo: ((top: number) => void) | undefined;

export function scrollToPage(top: number): void {
  if (moveTo) moveTo(top);
  else window.scrollTo({ top, behavior: 'instant' });
}

export function initSmoothScroll(): void {
  if (moveTo) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const response = scrollProfiles[scrollProfileForPath(location.pathname)];
  let frame = 0;
  let target = window.scrollY;
  let previousTime = 0;
  let writtenY = window.scrollY;
  const clamp = (top: number) =>
    Math.max(
      0,
      Math.min(top, document.documentElement.scrollHeight - window.innerHeight),
    );
  const cancel = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    target = window.scrollY;
  };
  const tick = (time: number) => {
    // CSS scroll locks cannot stop programmatic scrolling already in flight.
    if (document.querySelector('dialog:modal')) {
      cancel();
      return;
    }
    // Native focus, history restoration or another script may move the page.
    if (Math.abs(window.scrollY - writtenY) > 2) {
      cancel();
      return;
    }
    target = clamp(target);
    const elapsed = Math.min(64, time - previousTime);
    previousTime = time;
    const remaining = target - window.scrollY;
    const next =
      Math.abs(remaining) < 1
        ? target
        : window.scrollY + remaining * (1 - Math.exp(-elapsed / response));
    // Keep subpixel progress even where the browser rounds scroll positions.
    const step =
      Math.abs(next - window.scrollY) < 1 && Math.abs(remaining) >= 1
        ? window.scrollY + Math.sign(remaining)
        : next;
    window.scrollTo({ top: step, behavior: 'instant' });
    writtenY = window.scrollY;
    if (Math.abs(target - writtenY) < 1) {
      window.scrollTo({ top: target, behavior: 'instant' });
      frame = 0;
    } else frame = requestAnimationFrame(tick);
  };
  moveTo = (top) => {
    if (reduced.matches) {
      cancel();
      window.scrollTo({ top: clamp(top), behavior: 'instant' });
      return;
    }
    target = clamp(top);
    if (!frame) {
      writtenY = window.scrollY;
      previousTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };
  const nestedScroll = (event: WheelEvent) =>
    event.composedPath().some((node) => {
      if (
        !(node instanceof HTMLElement) ||
        node === document.body ||
        node === document.documentElement
      )
        return false;
      if (node.matches('textarea, select, [contenteditable], dialog[open]'))
        return true;
      const overflow = getComputedStyle(node).overflowY;
      return (
        /auto|scroll|overlay/.test(overflow) &&
        node.scrollHeight > node.clientHeight
      );
    });
  window.addEventListener(
    'wheel',
    (event) => {
      if (
        event.defaultPrevented ||
        !event.cancelable ||
        reduced.matches ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        Math.abs(event.deltaX) >= Math.abs(event.deltaY) ||
        nestedScroll(event)
      )
        return;
      const delta =
        event.deltaY *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? window.innerHeight
            : 1);
      const current = window.scrollY;
      const base =
        frame && Math.sign(delta) === Math.sign(target - current)
          ? target
          : current;
      const next = clamp(base + delta);
      if (next === current && !frame) return;
      event.preventDefault();
      moveTo?.(next);
    },
    { passive: false },
  );
  window.addEventListener('keydown', (event) => {
    if (
      [
        'ArrowDown',
        'ArrowUp',
        'PageDown',
        'PageUp',
        'Home',
        'End',
        ' ',
        'Escape',
      ].includes(event.key)
    )
      cancel();
  });
  window.addEventListener('pointerdown', cancel, { passive: true });
  window.addEventListener('touchstart', cancel, { passive: true });
  window.addEventListener('popstate', cancel);
  window.addEventListener('hashchange', cancel);
  window.addEventListener('pagehide', cancel);
  reduced.addEventListener('change', cancel);
  document.addEventListener('click', (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>('a[href]')
        : null;
    if (
      !link ||
      link.hasAttribute('download') ||
      (link.target && link.target !== '_self')
    )
      return;
    const url = new URL(link.href);
    if (
      url.origin !== location.origin ||
      url.pathname !== location.pathname ||
      url.search !== location.search ||
      !url.hash
    )
      return;
    let id: string;
    try {
      id = decodeURIComponent(url.hash.slice(1));
    } catch {
      return;
    }
    const element = document.getElementById(id);
    if (!element) return;
    event.preventDefault();
    if (element instanceof HTMLDetailsElement) element.open = true;
    if (location.hash !== url.hash) history.pushState(null, '', url.hash);
    const padding =
      Number.parseFloat(
        getComputedStyle(document.documentElement).scrollPaddingTop,
      ) || 0;
    moveTo?.(element.getBoundingClientRect().top + window.scrollY - padding);
    if (!element.hasAttribute('tabindex')) element.tabIndex = -1;
    element.focus({ preventScroll: true });
  });
}

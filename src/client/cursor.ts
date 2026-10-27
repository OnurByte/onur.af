/** A single inverted pointer, with native-cursor suppression owned by CSS. */
export function initCursor(): void {
  const ring = document.querySelector<HTMLElement>('[data-cursor-ring]');
  if (!ring) return;
  const pointer = window.matchMedia(
    '(any-hover: hover) and (any-pointer: fine)',
  );
  let x = 0;
  let y = 0;
  let visible = false;
  let pressed = false;
  const hide = (): void => {
    visible = false;
    pressed = false;
    ring.style.opacity = '0';
    // CSS still provides the custom circle, never a system arrow.
    delete document.documentElement.dataset['customCursor'];
  };
  const render = (target: Element | null): void => {
    if (!target || !visible) return;
    const field = target.closest(
      'textarea, input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]):not([type="image"]), [contenteditable]:not([contenteditable="false"])',
    );
    const unavailable = target.closest(
      ':disabled, [inert], [aria-disabled="true"]',
    );
    const interactive =
      !unavailable &&
      target.closest(
        'a[href], button, input, select, summary, [role="button"], [role="scrollbar"], label[for]',
      );
    const size = interactive ? (pressed ? 28 : 32) : pressed ? 20 : 24;
    ring.style.width = field && !unavailable ? '4px' : `${String(size)}px`;
    ring.style.height = field && !unavailable ? '24px' : `${String(size)}px`;
    ring.style.left = `${String(x)}px`;
    ring.style.top = `${String(y)}px`;
    ring.style.opacity = '1';
    // Difference blending needs the actual content's stacking context.
    const surface =
      target.closest('dialog[open], :popover-open') ?? document.body;
    if (ring.parentElement !== surface) surface.append(ring);
    document.documentElement.dataset['customCursor'] = 'active';
  };
  const update = (event: PointerEvent): void => {
    if (!pointer.matches || event.pointerType !== 'mouse') {
      hide();
      return;
    }
    x = event.clientX;
    y = event.clientY;
    visible = true;
    render(event.target instanceof Element ? event.target : null);
  };
  const refresh = (): void => {
    if (visible) render(document.elementFromPoint(x, y));
  };
  document.addEventListener('pointermove', update, { passive: true });
  document.addEventListener('pointerover', update, { passive: true });
  document.addEventListener(
    'pointerdown',
    (event) => {
      pressed = true;
      update(event);
    },
    { passive: true },
  );
  document.addEventListener(
    'pointerup',
    (event) => {
      pressed = false;
      update(event);
    },
    { passive: true },
  );
  document.addEventListener('pointercancel', hide);
  document.documentElement.addEventListener('pointerleave', hide);
  document.addEventListener('keydown', hide);
  document.addEventListener('scroll', refresh, {
    passive: true,
    capture: true,
  });
  document.addEventListener('close', refresh, { capture: true });
  document.addEventListener('toggle', refresh, { capture: true });
  window.addEventListener('blur', hide);
  document.addEventListener('visibilitychange', hide);
  pointer.addEventListener('change', hide);
}

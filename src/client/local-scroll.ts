export function initLocalScrollbars() {
  document
    .querySelectorAll<HTMLElement>('[data-local-scroll]')
    .forEach((track) => {
      if (track.hasAttribute('data-ready')) return;
      const viewport = document.getElementById(track.dataset['localScroll']!);
      if (!viewport) return;
      track.dataset['ready'] = '';
      const thumb = track.firstElementChild as HTMLElement;
      let max = 0,
        height = 0,
        size = 32,
        frame = 0,
        dirty = true;
      let dragging = false,
        offset = 0;
      function update() {
        frame = 0;
        if (dirty) {
          dirty = false;
          max = Math.max(0, viewport!.scrollHeight - viewport!.clientHeight);
          track.hidden = max < 1 || viewport!.clientHeight === 0;
          if (!track.hidden) {
            height = track.clientHeight;
            size = Math.min(
              height,
              Math.max(
                24,
                (height * viewport!.clientHeight) / viewport!.scrollHeight,
              ),
            );
            thumb.style.setProperty('--local-thumb-size', `${size}px`);
          }
        }
        const progress = max ? viewport!.scrollTop / max : 0;
        thumb.style.setProperty(
          '--local-thumb-top',
          `${Math.max(0, Math.min(1, progress)) * (height - size)}px`,
        );
        track.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
      }
      function schedule(measure = false) {
        dirty ||= measure;
        if (!frame) frame = requestAnimationFrame(update);
      }
      const move = (y: number) => {
        const top = track.getBoundingClientRect().top;
        viewport.scrollTop =
          Math.max(
            0,
            Math.min(1, (y - top - offset) / Math.max(1, height - size)),
          ) * max;
      };
      track.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        const local = event.clientY - track.getBoundingClientRect().top;
        const start = max ? (viewport.scrollTop / max) * (height - size) : 0;
        offset =
          local >= start && local <= start + size ? local - start : size / 2;
        dragging = true;
        track.setPointerCapture(event.pointerId);
        track.focus({ preventScroll: true });
        move(event.clientY);
      });
      track.addEventListener('pointermove', (event) => {
        if (dragging) move(event.clientY);
      });
      for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'])
        track.addEventListener(name, () => {
          dragging = false;
        });
      track.addEventListener('keydown', (event) => {
        const keys: Record<string, number> = {
          Home: 0,
          End: max,
          ArrowDown: viewport.scrollTop + 40,
          ArrowUp: viewport.scrollTop - 40,
          PageDown: viewport.scrollTop + viewport.clientHeight * 0.9,
          PageUp: viewport.scrollTop - viewport.clientHeight * 0.9,
          ' ':
            viewport.scrollTop +
            viewport.clientHeight * (event.shiftKey ? -0.9 : 0.9),
        };
        if (!(event.key in keys)) return;
        event.preventDefault();
        event.stopPropagation();
        viewport.scrollTop = keys[event.key]!;
      });
      viewport.addEventListener('scroll', () => schedule(), { passive: true });
      new ResizeObserver(() => schedule(true)).observe(viewport);
      new MutationObserver(() => schedule(true)).observe(viewport, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['hidden'],
      });
      const dialog = viewport.closest('dialog');
      if (dialog)
        new MutationObserver(() => schedule(true)).observe(dialog, {
          attributes: true,
          attributeFilter: ['open'],
        });
      const panel = viewport.closest('#scroll-sections');
      if (panel)
        new MutationObserver(() => schedule(true)).observe(panel, {
          attributes: true,
          attributeFilter: ['hidden'],
        });
      viewport.setAttribute('data-custom-scroll', '');
      update();
    });
}

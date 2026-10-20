import { scrollToPage } from './smooth-scroll';
import { initGlassSurface } from './glass-surface';

export function initScrollRail() {
  const root = document.querySelector<HTMLElement>('[data-scroll-rail]');
  if (!root) return;
  const track = root.querySelector<HTMLElement>('[data-scroll-track]')!;
  const thumb = root.querySelector<HTMLElement>('[data-scroll-thumb]')!;
  const trigger = track;
  const panel = root.querySelector<HTMLElement>('#scroll-sections')!;
  const list = root.querySelector<HTMLElement>('[data-scroll-list]')!;
  const content = document.getElementById('content')!;
  const entryTemplate = root.querySelector<HTMLTemplateElement>(
    '[data-scroll-entry]',
  )!;
  const markerTemplate = root.querySelector<HTMLTemplateElement>(
    '[data-scroll-marker]',
  )!;
  let sections: HTMLElement[] = [];
  let links: HTMLAnchorElement[] = [];
  let starts: number[] = [];
  let markers: HTMLElement[] = [];
  let maxScroll = 0,
    trackHeight = 0,
    trackTop = 0,
    thumbSize = 32;
  let frame = 0,
    geometryDirty = true,
    discoveryDirty = true;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let dismissed = false,
    dragging = false,
    dragOffset = 0,
    pointerDown = false,
    pointerStart = 0,
    suppressClick = false;
  const locked = () => Boolean(document.querySelector('dialog:modal'));

  function close() {
    panel.hidden = true;
  }
  function open() {
    if (dismissed || !sections.length || locked()) return;
    clearTimeout(closeTimer);
    panel.hidden = false;
    initGlassSurface(panel);
  }
  function discover() {
    discoveryDirty = false;
    const next = [
      ...content.querySelectorAll<HTMLElement>(
        '[data-scroll-section][id], [data-scroll-headings] :is(h2,h3,h4,h5,h6)[id]',
      ),
    ].filter((node) => !node.closest('dialog, [data-scroll-archive]'));
    if (
      markers.length &&
      next.length === sections.length &&
      next.every((node, index) => node === sections[index])
    ) {
      next.forEach((node, index) => {
        links[index]!.textContent = sectionLabel(node);
      });
      return;
    }
    sections = next;
    geometryDirty = true;
    root!.style.setProperty(
      '--rail-height',
      `${Math.max(32, Math.min(320, Math.max(sections.length, 2) * 16))}px`,
    );
    list.replaceChildren();
    markers.forEach((marker) => marker.remove());
    markers = [];
    links = sections.map((section) => {
      const item = entryTemplate.content.firstElementChild!.cloneNode(
        true,
      ) as HTMLElement;
      const link = item.querySelector('a')!;
      link.href = `#${encodeURIComponent(section.id)}`;
      link.dataset['section'] = section.id;
      link.textContent = sectionLabel(section);
      const depth = /^H[2-6]$/.test(section.tagName)
        ? Number(section.tagName[1]) - 2
        : 0;
      link.style.setProperty('--section-depth', String(Math.min(3, depth)));
      list.append(item);
      const marker = markerTemplate.content.firstElementChild!.cloneNode(
        true,
      ) as HTMLElement;
      const tick = marker.querySelector('a')!;
      tick.href = link.href;
      tick.draggable = false;
      tick.dataset['section'] = section.id;
      tick.setAttribute('aria-label', link.textContent!);
      root!.append(marker);
      markers.push(marker);
      return link;
    });
    track.setAttribute(
      'aria-label',
      sections.length ? 'Page scroll and sections' : 'Page scroll',
    );
    if (!sections.length) {
      close();
      const marker = markerTemplate.content.firstElementChild!.cloneNode(
        true,
      ) as HTMLElement;
      const tick = marker.querySelector('a')!;
      tick.setAttribute('aria-hidden', 'true');
      tick.style.pointerEvents = 'none';
      marker.style.top = '50%';
      root!.append(marker);
      markers.push(marker);
    }
  }
  function measure() {
    geometryDirty = false;
    maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - innerHeight,
    );
    const bounds = root!.getBoundingClientRect();
    trackTop = bounds.top;
    trackHeight = bounds.height;
    thumbSize = Math.min(
      trackHeight,
      Math.max(32, (trackHeight * innerHeight) / (maxScroll + innerHeight)),
    );
    const readingLine = Math.min(160, innerHeight * 0.25);
    starts = sections.map((section) =>
      Math.max(
        0,
        Math.min(
          maxScroll,
          section.getBoundingClientRect().top + scrollY - readingLine,
        ),
      ),
    );
    thumb.style.setProperty('--thumb-size', `${thumbSize}px`);
    markers.forEach((marker, i) =>
      marker.style.setProperty(
        '--marker-position',
        `${sections.length > 1 ? (i / (sections.length - 1)) * (trackHeight - 16) : (trackHeight - 16) / 2}px`,
      ),
    );
  }
  function update() {
    frame = 0;
    if (discoveryDirty) discover();
    if (geometryDirty) measure();
    const y = Math.max(0, Math.min(maxScroll, scrollY));
    thumb.style.setProperty(
      '--thumb-top',
      `${maxScroll ? (y / maxScroll) * (trackHeight - thumbSize) : 0}px`,
    );
    track.setAttribute(
      'aria-valuenow',
      String(maxScroll ? Math.round((y / maxScroll) * 100) : 0),
    );
    let active = 0;
    starts.forEach((start, i) => {
      if (y + 1 >= start) active = i;
    });
    links.forEach((link, i) => {
      const start = starts[i] ?? 0;
      const end = starts[i + 1] ?? maxScroll;
      const progress =
        i < active
          ? 1
          : i > active || maxScroll === 0
            ? 0
            : end <= start
              ? 1
              : Math.max(0, Math.min(1, (y - start) / (end - start)));
      for (const item of [link, markers[i]?.querySelector('a')]) {
        if (i === active) item?.setAttribute('aria-current', 'location');
        else item?.removeAttribute('aria-current');
        item?.style.setProperty('--tick-width', i === active ? '20px' : '12px');
        item?.style.setProperty('--tick-base', i === active ? '55%' : '25%');
        item?.style.setProperty('--section-progress', String(progress));
      }
    });
    if (locked()) close();
  }
  function schedule(geometry = false, discovery = false) {
    geometryDirty ||= geometry;
    discoveryDirty ||= discovery;
    if (!frame) frame = requestAnimationFrame(update);
  }
  root.addEventListener('pointerenter', () => {
    dismissed = false;
    open();
  });
  root.addEventListener('pointerleave', () => {
    closeTimer = setTimeout(() => {
      if (!root.contains(document.activeElement)) close();
    }, 180);
  });
  root.addEventListener('focusin', () => {
    dismissed = false;
    open();
  });
  root.addEventListener('focusout', () => {
    queueMicrotask(() => {
      if (!root.contains(document.activeElement) && !root.matches(':hover'))
        close();
    });
  });
  trigger.addEventListener('click', () => {
    dismissed = false;
    open();
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      trigger.focus();
      dismissed = true;
      close();
    }
  });
  root.addEventListener('click', (event) => {
    if (suppressClick) {
      suppressClick = false;
      event.preventDefault();
      return;
    }
    const link =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>('a')
        : null;
    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      locked()
    )
      return;
    const index = sections.findIndex(
      (section) => section.id === link.dataset['section'],
    );
    const target = sections[index];
    if (!target) return;
    event.preventDefault();
    for (const ancestor of [target, ...ancestors(target)])
      if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
    measure();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    if (!target.hasAttribute('tabindex')) target.tabIndex = -1;
    target.focus({ preventScroll: true });
    scrollToPage(starts[index]!);
  });
  track.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === 'ArrowLeft') {
      event.preventDefault();
      event.stopPropagation();
      dismissed = false;
      open();
      return;
    }
    const destinations: Record<string, number> = {
      Home: 0,
      End: maxScroll,
      ArrowDown: scrollY + 40,
      ArrowUp: scrollY - 40,
      PageDown: scrollY + innerHeight * 0.9,
      PageUp: scrollY - innerHeight * 0.9,
      ' ': scrollY + innerHeight * (event.shiftKey ? -0.9 : 0.9),
    };
    if (!(event.key in destinations) || locked()) return;
    event.preventDefault();
    // The global smooth-scroll key handler cancels native keyboard moves.
    // This scrollbar already owns this movement.
    event.stopPropagation();
    scrollToPage(destinations[event.key]!);
  });
  const pointerScroll = (clientY: number) => {
    if (locked()) return;
    const fraction =
      (clientY - trackTop - dragOffset) / Math.max(1, trackHeight - thumbSize);
    // Dragging must follow the pointer directly; native writes also cancel pending smoothing.
    window.scrollTo({
      top: Math.max(0, Math.min(1, fraction)) * maxScroll,
      behavior: 'instant',
    });
  };
  root.addEventListener('pointerdown', (event) => {
    if (
      event.button !== 0 ||
      locked() ||
      (event.target instanceof Element && event.target.closest('nav'))
    )
      return;
    measure();
    const onLink = event.target instanceof Element && event.target.closest('a');
    suppressClick = false;
    pointerDown = true;
    dragging = false;
    pointerStart = event.clientY;
    const top = maxScroll
      ? (scrollY / maxScroll) * (trackHeight - thumbSize)
      : 0;
    const local = event.clientY - trackTop;
    dragOffset = onLink
      ? local - top
      : local >= top && local <= top + thumbSize
        ? local - top
        : thumbSize / 2;
    if (!onLink) {
      event.preventDefault();
      track.focus({ preventScroll: true });
      pointerScroll(event.clientY);
    }
  });
  window.addEventListener('pointermove', (event) => {
    if (!pointerDown) return;
    if (!dragging && Math.abs(event.clientY - pointerStart) > 3) {
      dragging = true;
      root.setPointerCapture(event.pointerId);
    }
    if (dragging) pointerScroll(event.clientY);
  });
  for (const name of ['pointerup', 'pointercancel'])
    window.addEventListener(name, () => {
      if (dragging) suppressClick = true;
      pointerDown = false;
      dragging = false;
    });
  window.addEventListener('scroll', () => schedule(), { passive: true });
  window.addEventListener('resize', () => schedule(true));
  window.addEventListener('pageshow', () => schedule(true));
  content.addEventListener('load', () => schedule(true), true);
  content.addEventListener('toggle', () => schedule(true), true);
  new ResizeObserver(() => schedule(true)).observe(content);
  new MutationObserver((records) => {
    const relevant = records.some((record) => {
      const target =
        record.target instanceof Element
          ? record.target
          : record.target.parentElement;
      if (target?.closest('[data-scroll-headings], [data-scroll-section]'))
        return true;
      return [...record.addedNodes, ...record.removedNodes].some(
        (node) =>
          node instanceof Element &&
          (node.matches('[data-scroll-headings], [data-scroll-section]') ||
            node.querySelector(
              '[data-scroll-headings], [data-scroll-section]',
            )),
      );
    });
    if (relevant) schedule(true, true);
  }).observe(content, {
    childList: true,
    subtree: true,
    characterData: true,
  });
  new MutationObserver(() => {
    if (locked()) close();
  }).observe(document.body, {
    attributes: true,
    subtree: true,
    attributeFilter: ['open'],
  });
  void document.fonts.ready.then(() => schedule(true));
  root.hidden = false;
  document.documentElement.setAttribute('data-scroll-enhanced', '');
  update();
}

function ancestors(node: HTMLElement): HTMLElement[] {
  const result: HTMLElement[] = [];
  for (let parent = node.parentElement; parent; parent = parent.parentElement)
    result.push(parent);
  return result;
}

function sectionLabel(section: HTMLElement) {
  if (section.dataset['scrollLabel']) return section.dataset['scrollLabel'];
  const label = section.cloneNode(true) as HTMLElement;
  label
    .querySelectorAll('[aria-hidden="true"]')
    .forEach((node) => node.remove());
  return label.textContent?.trim() || section.id;
}

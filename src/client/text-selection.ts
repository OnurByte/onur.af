import {
  selectionOutline,
  type SelectionBox,
} from '../portfolio/selection-outline';
export function initTextSelection(): void {
  const layer = document.querySelector<SVGSVGElement>('[data-selection-layer]');
  const path = document.querySelector<SVGPathElement>('[data-selection-path]');
  if (!layer || !path) return;
  let frame = 0;
  let focusedRange: Range | undefined;
  document.addEventListener('annotation-focus', (event) => {
    const detail: unknown =
      event instanceof CustomEvent ? event.detail : undefined;
    focusedRange = detail instanceof Range ? detail.cloneRange() : undefined;
    refresh();
  });
  function draw(): void {
    frame = 0;
    if (!layer || !path) return;
    path.removeAttribute('d');
    delete document.documentElement.dataset['roundedSelection'];
    const active = document.activeElement;
    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      (active instanceof HTMLElement && active.isContentEditable) ||
      matchMedia('(forced-colors: active)').matches
    )
      return;
    const selection = getSelection();
    const ranges =
      selection?.rangeCount && !selection.isCollapsed
        ? Array.from({ length: selection.rangeCount }, (_, i) =>
            selection.getRangeAt(i),
          )
        : focusedRange
          ? [focusedRange]
          : [];
    if (!ranges.length) return;
    const boxes: SelectionBox[] = [];
    for (const range of ranges)
      for (const rect of range.getClientRects()) {
        if (
          rect.width < 1 ||
          rect.height < 1 ||
          rect.bottom <= 0 ||
          rect.top >= innerHeight ||
          rect.right <= 0 ||
          rect.left >= innerWidth
        )
          continue;
        const box = {
          left: Math.max(0, rect.left),
          right: Math.min(innerWidth, rect.right),
          top: Math.max(0, rect.top),
          bottom: Math.min(innerHeight, rect.bottom),
        };
        const previous = boxes.at(-1);
        if (
          previous &&
          Math.abs(previous.top - box.top) < 3 &&
          Math.abs(previous.bottom - box.bottom) < 3 &&
          box.left <= previous.right + 2
        ) {
          previous.left = Math.min(previous.left, box.left);
          previous.right = Math.max(previous.right, box.right);
        } else boxes.push(box);
      }
    const outline = selectionOutline(
      boxes.slice(0, 128).map((box) => ({
        left: Math.max(0, box.left - 4),
        right: Math.min(innerWidth, box.right + 4),
        top: Math.max(0, box.top - 3),
        bottom: Math.min(innerHeight, box.bottom + 3),
      })),
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--radius-control',
        ),
      ) || 8,
    );
    if (outline) {
      path.setAttribute('d', outline);
      document.documentElement.dataset['roundedSelection'] = '';
    }
  }
  function refresh(): void {
    if (!frame) frame = requestAnimationFrame(draw);
  }
  document.addEventListener('selectionchange', refresh);
  document.addEventListener('focusin', refresh);
  window.addEventListener('scroll', refresh, { passive: true });
  window.addEventListener('resize', refresh);
  document.fonts.addEventListener('loadingdone', refresh);
}

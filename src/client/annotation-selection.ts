import { quotePath } from '../portfolio/quote-link';
import {
  anchorSelection,
  type TextTarget,
} from '../portfolio/annotations/protocol';
import { required } from '../portfolio/required';

/** Text of `node` as annotations see it: buttons, templates and markers are excluded. */
export function cleanText(node: Node): string {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement?.closest('button,template,[data-annotation-marker]')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  let text = '';
  let next: Node | null;
  while ((next = walker.nextNode())) text += next.textContent ?? '';
  return text;
}

export interface SelectionController {
  /** Re-reads the page selection and repositions the floating actions. */
  capture(): void;
  /** The most recent selection inside the revision body, if any. */
  range(): Range | undefined;
  /** Restores the last selection and refocuses the Annotate button. */
  restore(): void;
}

/** Floating "Annotate" / "Copy quote link" actions that follow the reader's text selection. */
export function initSelectionActions({
  root,
  body,
  form,
  onAnnotate,
}: {
  root: HTMLElement;
  body: HTMLElement;
  form: HTMLFormElement;
  onAnnotate: (target: TextTarget) => void;
}): SelectionController {
  const selectButton = root.querySelector<HTMLButtonElement>(
    '[data-annotation-select]',
  );
  const selectionActions = root.querySelector<HTMLElement>(
    '[data-selection-actions]',
  );
  const copyQuote = root.querySelector<HTMLButtonElement>('[data-quote-copy]');
  const quoteStatus = root.querySelector<HTMLElement>('[data-quote-status]');
  let selectedRange: Range | undefined;
  let selectedTarget: TextTarget | undefined;
  let copiedTarget: TextTarget | undefined;
  let selecting = false;
  function captureSelection(): void {
    if (!selectionActions) return;
    const selection = getSelection();
    if (
      selecting ||
      !selection?.rangeCount ||
      selection.isCollapsed ||
      !body.contains(selection.getRangeAt(0).commonAncestorContainer)
    ) {
      selectionActions.hidden = true;
      if (!selection?.rangeCount || selection.isCollapsed)
        copiedTarget = undefined;
      return;
    }
    if (form.matches(':popover-open')) return;
    const range = selection.getRangeAt(0);
    selectedRange = range.cloneRange();
    try {
      const before = document.createRange();
      before.selectNodeContents(body);
      before.setEnd(range.startContainer, range.startOffset);
      const start = cleanText(before.cloneContents()).length;
      selectedTarget = anchorSelection(
        cleanText(body),
        start,
        start + cleanText(range.cloneContents()).length,
      );
      if (
        copiedTarget?.position.start === selectedTarget.position.start &&
        copiedTarget.position.end === selectedTarget.position.end
      ) {
        selectionActions.hidden = true;
        return;
      }
      copiedTarget = undefined;
      const edge = document.createRange();
      if (selection.focusNode) {
        edge.setStart(selection.focusNode, selection.focusOffset);
        edge.collapse(true);
      }
      const visibleRects = Array.from(range.getClientRects()).filter(
        (rect) => rect.bottom > 112 && rect.top < innerHeight - 20,
      );
      const focusRect = edge.getClientRects()[0];
      const rect =
        focusRect && focusRect.bottom > 112 && focusRect.top < innerHeight - 20
          ? focusRect
          : (visibleRects.at(-1) ?? range.getBoundingClientRect());
      selectionActions.style.setProperty(
        '--annotation-x',
        `${String(Math.max(20, Math.min(innerWidth - 200, rect.left)))}px`,
      );
      selectionActions.style.setProperty(
        '--annotation-y',
        `${String(rect.bottom + 64 <= innerHeight ? Math.max(112, rect.bottom + 16) : Math.max(112, rect.top - 64))}px`,
      );
      selectionActions.hidden = rect.bottom < 100 || rect.top > innerHeight;
    } catch {
      selectionActions.hidden = true;
    }
  }
  if (selectionActions) {
    selectionActions.hidden = true;
    document.addEventListener('selectionchange', captureSelection);
    document.addEventListener('pointerdown', (event) => {
      if (event.target instanceof Node && body.contains(event.target)) {
        selecting = true;
        copiedTarget = undefined;
        selectionActions.hidden = true;
      }
    });
    document.addEventListener('pointerup', () => {
      if (!selecting) return;
      selecting = false;
      captureSelection();
    });
    document.addEventListener('pointercancel', () => {
      selecting = false;
      captureSelection();
    });
    selectionActions.addEventListener('pointerdown', (event) => {
      event.preventDefault();
    });
    window.addEventListener('resize', captureSelection);
    copyQuote?.addEventListener('click', () => {
      if (!selectedTarget) return;
      const quoteTarget = selectedTarget;
      const path = quotePath(
        required(root.dataset['log']),
        Number(root.dataset['revision']),
        selectedTarget.position.start,
        selectedTarget.position.end,
      );
      if (quoteStatus) quoteStatus.textContent = '';
      void Promise.resolve()
        .then(() =>
          navigator.clipboard.writeText(new URL(path, location.origin).href),
        )
        .then(() => {
          copiedTarget = quoteTarget;
          captureSelection();
          if (quoteStatus) quoteStatus.textContent = 'Quote link copied.';
        })
        .catch(() => {
          if (quoteStatus)
            quoteStatus.textContent =
              'Could not copy the quote link. Try again.';
        });
    });
    window.addEventListener(
      'scroll',
      () => {
        if (!selectionActions.hidden) captureSelection();
      },
      { passive: true },
    );
    selectButton?.addEventListener('click', () => {
      if (!selectedTarget) return;
      selectionActions.hidden = true;
      onAnnotate(selectedTarget);
    });
    captureSelection();
  }
  return {
    capture: captureSelection,
    range: () => selectedRange,
    restore() {
      if (!selectedRange) return;
      const selection = getSelection();
      selection?.removeAllRanges();
      selection?.addRange(selectedRange.cloneRange());
      captureSelection();
      selectButton?.focus({ preventScroll: true });
    },
  };
}

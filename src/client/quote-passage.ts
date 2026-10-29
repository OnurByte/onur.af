export function focusQuotePassage(): void {
  const root = document.querySelector<HTMLElement>('[data-quote-passage]');
  const body = root?.querySelector<HTMLElement>('[data-annotation-revision]');
  if (!root || !body) return;
  const start = Number(root.dataset['start']);
  const end = Number(root.dataset['end']);
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest('button,template,[data-annotation-marker]')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  const range = document.createRange();
  let offset = 0;
  let started = false;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const length = node.textContent?.length ?? 0;
    if (!started && start < offset + length) {
      range.setStart(node, start - offset);
      started = true;
    }
    if (started && end <= offset + length) {
      range.setEnd(node, end - offset);
      const selection = getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      const anchor = range.startContainer.parentElement;
      requestAnimationFrame(() => {
        anchor?.scrollIntoView({ block: 'center', behavior: 'instant' });
      });
      break;
    }
    offset += length;
  }
}

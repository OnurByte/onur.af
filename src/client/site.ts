import { siteSignature } from '../portfolio/signature';

function copyAllowed(node: Node | null): Element | null {
  const element = node instanceof Element ? node : node?.parentElement;
  return element?.closest('[data-copy-allowed]') ?? null;
}

document.addEventListener('contextmenu', (event) => event.preventDefault());

document.addEventListener('copy', (event) => {
  if (
    event.target instanceof HTMLTextAreaElement &&
    copyAllowed(event.target)
  ) {
    return;
  }
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    const allowed = copyAllowed(selection.anchorNode);
    if (allowed && allowed === copyAllowed(selection.focusNode)) return;
  } else if (event.target instanceof Node && copyAllowed(event.target)) {
    return;
  }
  event.preventDefault();
});

console.info(siteSignature);

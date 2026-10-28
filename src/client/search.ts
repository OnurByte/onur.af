import { openDialog, closeDialog } from './dialogs';
export {};
const trigger = document.querySelector<HTMLButtonElement>('#open-search');
const dialog = document.querySelector<HTMLDialogElement>('#search-dialog');
const input = document.querySelector<HTMLInputElement>('#search-query');
const status = document.querySelector<HTMLElement>('#search-status');
const results = document.querySelector<HTMLUListElement>('#search-results');
const entries = [...(results?.children ?? [])].map((item) => {
  const node = item.cloneNode(true) as HTMLElement;
  // Fragment destinations need the enhanced close-before-navigation handler.
  node.hidden = false;
  return {
    text: (
      (item as HTMLElement).dataset['searchText'] ??
      item.textContent ??
      ''
    ).toLowerCase(),
    node,
  };
});
let rankedSearch: ((query: string) => Set<number>) | undefined;
let engineTask: Promise<void> | undefined;
function prepareEngine(): void {
  engineTask ??= import('./search-engine')
    .then(({ createRankedSearch }) => {
      rankedSearch = createRankedSearch(entries.map(({ text }) => text));
      if (dialog?.open) search();
    })
    .catch(() => {
      // The local substring filter remains fully usable offline or on load failure.
      engineTask = undefined;
    });
}
trigger?.addEventListener('pointerenter', prepareEngine, { once: true });
trigger?.addEventListener('focus', prepareEngine, { once: true });
function open() {
  if (!dialog || !input) return;
  prepareEngine();
  openDialog(dialog, trigger);
  input.focus();
  input.select();
  search();
}
trigger?.addEventListener('click', (event) => {
  // The native command is the fallback; the enhanced controller owns focus
  // and exclusive dialogs once this module has loaded.
  event.preventDefault();
  open();
});
if (input) input.disabled = false;
results?.addEventListener('click', (event) => {
  if (
    !dialog ||
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
  // Let same-page navigation focus the destination after it is no longer inert.
  closeDialog(dialog, { restoreFocus: false });
});
document.addEventListener('keydown', (event) => {
  if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === 'k' &&
    !event.altKey &&
    !event.repeat
  ) {
    event.preventDefault();
    if (dialog?.open) closeDialog(dialog);
    else open();
  }
});
dialog?.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    closeDialog(dialog);
});
dialog?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeDialog(dialog);
    return;
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const links = [...(results?.querySelectorAll<HTMLAnchorElement>('a') ?? [])];
  if (!links.length) return;
  event.preventDefault();
  const index = links.indexOf(document.activeElement as HTMLAnchorElement);
  const next =
    index < 0
      ? event.key === 'ArrowDown'
        ? 0
        : links.length - 1
      : (index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) %
        links.length;
  links[next]?.focus();
});
function search() {
  if (!input || !status || !results) return;
  const terms = input.value.trim().slice(0, 200).toLowerCase().split(/\s+/);
  const query = input.value.trim().slice(0, 200);
  const ranked = query ? rankedSearch?.(query) : undefined;
  const matches = entries.filter(
    ({ text }, id) =>
      terms.every((term) => text.includes(term)) || (ranked?.has(id) ?? false),
  );
  results.replaceChildren(...matches.map(({ node }) => node.cloneNode(true)));
  status.hidden = matches.length > 0;
  status.textContent = matches.length ? '' : 'Nothing found.';
}
input?.addEventListener('input', search);

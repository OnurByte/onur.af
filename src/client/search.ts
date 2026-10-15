export {};
const trigger = document.querySelector<HTMLButtonElement>('#open-search');
const dialog = document.querySelector<HTMLDialogElement>('#search-dialog');
const input = document.querySelector<HTMLInputElement>('#search-query');
const status = document.querySelector<HTMLElement>('#search-status');
const results = document.querySelector<HTMLUListElement>('#search-results');
const entries = [...(results?.children ?? [])].map((item) => ({
  text: (
    (item as HTMLElement).dataset.searchText ??
    item.textContent ??
    ''
  ).toLowerCase(),
  node: item.cloneNode(true),
}));
function open() {
  if (!dialog || !input) return;
  dialog.showModal();
  input.focus();
  input.select();
  search();
}
trigger?.addEventListener('click', open);
if (trigger && dialog) trigger.hidden = false;
document.addEventListener('keydown', (event) => {
  if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === 'k' &&
    !event.altKey &&
    !event.repeat
  ) {
    event.preventDefault();
    if (dialog?.open) dialog.close();
    else open();
  }
});
dialog?.addEventListener('close', () => {
  trigger?.focus();
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
    dialog.close();
});
dialog?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    dialog.close();
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
  const matches = entries.filter(({ text }) =>
    terms.every((term) => text.includes(term)),
  );
  results.replaceChildren(...matches.map(({ node }) => node.cloneNode(true)));
  status.hidden = matches.length > 0;
  status.textContent = matches.length ? '' : 'Nothing found.';
}
input?.addEventListener('input', search);

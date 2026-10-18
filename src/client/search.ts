import { openDialog, closeDialog } from './dialogs';
export {};
const trigger = document.querySelector<HTMLButtonElement>('#open-search');
const dialog = document.querySelector<HTMLDialogElement>('#search-dialog');
const input = document.querySelector<HTMLInputElement>('#search-query');
const status = document.querySelector<HTMLElement>('#search-status');
const results = document.querySelector<HTMLUListElement>('#search-results');
const entries = [...(results?.children ?? [])].map((item) => ({
  text: (
    (item as HTMLElement).dataset['searchText'] ??
    item.textContent ??
    ''
  ).toLowerCase(),
  node: item.cloneNode(true),
}));
function open() {
  if (!dialog || !input) return;
  openDialog(dialog, trigger);
  input.focus();
  input.select();
  search();
  void loadLogs();
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
  const ranked = query && logSearch ? logSearch(query) : undefined;
  const matches = entries.filter(
    ({ text, node }) =>
      terms.every((term) => text.includes(term)) ||
      (ranked?.has(
        (node as HTMLElement).querySelector('a')?.getAttribute('href') ?? '',
      ) ??
        false),
  );
  results.replaceChildren(...matches.map(({ node }) => node.cloneNode(true)));
  status.hidden = matches.length > 0;
  status.textContent = matches.length ? '' : 'Nothing found.';
}
input?.addEventListener('input', search);

let loading: Promise<void> | undefined;
let loaded = false;
async function loadLogs() {
  if (loaded) return;
  if (loading) return loading;
  loading = (async () => {
    try {
      const [{ default: MiniSearch }, response] = await Promise.all([
        import('minisearch'),
        fetch('/search-index.json', { signal: AbortSignal.timeout(10000) }),
      ]);
      if (!response.ok) throw new Error('Index unavailable');
      const documents: {
        url: string;
        meta: { title: string; description: string };
        searchText: string;
      }[] = await response.json();
      const index = new MiniSearch({ idField: 'url', fields: ['searchText'] });
      index.addAll(documents);
      const template = document.querySelector<HTMLTemplateElement>(
        '#search-result-template',
      );
      if (!template) throw new Error('Search template unavailable');
      for (const item of documents) {
        const node = template.content.firstElementChild!.cloneNode(
          true,
        ) as HTMLElement;
        node.querySelector('a')!.setAttribute('href', item.url);
        node.querySelector('[data-result-title]')!.textContent =
          item.meta.title;
        node.querySelector('[data-result-description]')!.textContent =
          item.meta.description;
        entries.push({ text: item.searchText.toLowerCase(), node });
      }
      logSearch = (query) =>
        new Set(
          index
            .search(query, {
              prefix: true,
              combineWith: 'AND',
              boost: { searchText: 1 },
            })
            .map((result) => String(result.id)),
        );
      loaded = true;
      search();
    } catch {
      if (status) {
        status.hidden = false;
        status.textContent = 'Log search unavailable. Reopen Find to retry.';
      }
    } finally {
      loading = undefined;
    }
  })();
  return loading;
}
let logSearch: ((query: string) => Set<string>) | undefined;

export {};
type Pagefind = {
  search: (query: string) => Promise<{
    results: Array<{
      data: () => Promise<{
        url: string;
        meta: { title?: string; description?: string };
      }>;
    }>;
  }>;
};
const trigger = document.querySelector<HTMLButtonElement>('#open-search');
const dialog = document.querySelector<HTMLDialogElement>('#search-dialog');
const input = document.querySelector<HTMLInputElement>('#search-query');
const status = document.querySelector<HTMLElement>('#search-status');
const results = document.querySelector<HTMLUListElement>('#search-results');
const close = document.querySelector<HTMLButtonElement>('#close-search');
const defaults = [...(results?.children ?? [])].map((item) =>
  item.cloneNode(true),
);
const resultClass = results?.querySelector('a')?.className ?? '';
const detailClass = results?.querySelector('small')?.className ?? '';
let pagefind: Promise<Pagefind> | undefined;
let revision = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
function open() {
  if (!dialog || !input) return;
  dialog.showModal();
  input.focus();
  input.select();
  clearTimeout(timer);
  void search(++revision);
}
trigger?.addEventListener('click', open);
close?.addEventListener('click', () => dialog?.close());
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
  revision++;
  clearTimeout(timer);
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
async function search(current: number) {
  if (!input || !status || !results) return;
  const query = input.value.trim().slice(0, 200);
  if (!query) {
    results.replaceChildren(...defaults.map((item) => item.cloneNode(true)));
    status.textContent = 'Pages';
    return;
  }
  status.textContent = 'Searching…';
  try {
    const moduleUrl = '/pagefind/pagefind.js';
    pagefind ??= import(/* @vite-ignore */ moduleUrl) as Promise<Pagefind>;
    const response = await (await pagefind).search(query);
    const pages = await Promise.all(
      response.results.map((result) => result.data()),
    );
    if (current !== revision) return;
    results.replaceChildren();
    for (const page of pages) {
      const url = new URL(page.url, window.location.origin);
      if (
        url.origin !== window.location.origin ||
        !['/', '/donate', '/rss', '/pgp'].includes(url.pathname)
      )
        continue;
      const item = document.createElement('li');
      const link = document.createElement('a');
      const title = document.createElement('span');
      const detail = document.createElement('small');
      link.href = url.pathname;
      link.className = resultClass;
      title.textContent = page.meta.title ?? url.pathname;
      detail.textContent = page.meta.description ?? '';
      detail.className = detailClass;
      link.append(title, detail);
      item.append(link);
      results.append(item);
    }
    status.textContent = results.children.length
      ? `${results.children.length} result${results.children.length === 1 ? '' : 's'}.`
      : 'No results.';
  } catch {
    pagefind = undefined;
    if (current === revision) {
      results.replaceChildren(...defaults.map((item) => item.cloneNode(true)));
      status.textContent = 'Search is unavailable. Choose a page below.';
    }
  }
}
input?.addEventListener('input', () => {
  clearTimeout(timer);
  const current = ++revision;
  timer = setTimeout(() => {
    void search(current);
  }, 120);
});

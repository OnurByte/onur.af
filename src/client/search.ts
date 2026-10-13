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
const templates = new Map(
  [...(results?.querySelectorAll<HTMLAnchorElement>('a') ?? [])].map((link) => [
    link.getAttribute('href') ?? '',
    link.cloneNode(true) as HTMLAnchorElement,
  ]),
);
const networks = [
  ...(results?.querySelectorAll<HTMLElement>('[data-network-label]') ?? []),
].map((item) => ({
  text: item.textContent?.toLowerCase() ?? '',
  node: item.cloneNode(true),
}));
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
    status.hidden = true;
    status.textContent = '';
    return;
  }
  status.hidden = false;
  status.textContent = 'Loading…';
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
      const template = templates.get(url.pathname);
      if (!template) continue;
      const item = document.createElement('li');
      const link = template.cloneNode(true) as HTMLAnchorElement;
      link.href = url.pathname;
      const title = link.querySelector('[data-result-title]');
      const detail = link.querySelector('[data-result-description]');
      if (title) title.textContent = page.meta.title ?? url.pathname;
      if (detail) detail.textContent = page.meta.description ?? '';
      item.append(link);
      results.append(item);
    }
    for (const network of networks) {
      if (network.text.includes(query.toLowerCase()))
        results.append(network.node.cloneNode(true));
    }
    status.hidden = results.children.length > 0;
    status.textContent = results.children.length ? '' : 'Nothing found.';
  } catch {
    pagefind = undefined;
    if (current === revision) {
      results.replaceChildren(...defaults.map((item) => item.cloneNode(true)));
      status.hidden = false;
      status.textContent = 'Unavailable. Choose a page below.';
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

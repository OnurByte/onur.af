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

const form = document.querySelector<HTMLFormElement>('#search-form');
const input = document.querySelector<HTMLInputElement>('#search-query');
const status = document.querySelector<HTMLElement>('#search-status');
const results = document.querySelector<HTMLUListElement>('#search-results');
const moduleUrl = '/pagefind/pagefind.js';
let pagefind: Promise<Pagefind> | undefined;
let revision = 0;

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!input || !status || !results) return;
  const current = ++revision;
  results.replaceChildren();
  const query = input.value.trim().slice(0, 200);
  if (!query) {
    status.textContent = 'Enter a search term.';
    return;
  }
  status.textContent = 'Searching…';
  try {
    pagefind ??= import(/* @vite-ignore */ moduleUrl) as Promise<Pagefind>;
    const response = await (await pagefind).search(query);
    const pages = await Promise.all(
      response.results.map((result) => result.data()),
    );
    if (current !== revision) return;
    for (const page of pages) {
      const url = new URL(page.url, window.location.origin);
      if (
        url.origin !== window.location.origin ||
        !['/', '/donate', '/rss', '/pgp'].includes(url.pathname)
      )
        continue;
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = url.pathname;
      link.textContent = page.meta.title ?? url.pathname;
      item.append(
        link,
        document.createTextNode(` — ${page.meta.description ?? ''}`),
      );
      results.append(item);
    }
    status.textContent = results.children.length
      ? `${results.children.length} result${results.children.length === 1 ? '' : 's'}.`
      : 'No results.';
  } catch {
    pagefind = undefined;
    if (current === revision)
      status.textContent = 'Search is unavailable. Use the page links below.';
  }
});

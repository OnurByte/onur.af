import { siteSignature } from '../portfolio/signature';

document.addEventListener('contextmenu', (event) => event.preventDefault());
document.addEventListener('copy', (event) => event.preventDefault());

document
  .querySelectorAll<HTMLButtonElement>('[data-copy]')
  .forEach((button) => {
    const originalWidth = button.getBoundingClientRect().width;
    button.setAttribute('aria-live', 'polite');
    button.addEventListener('click', async () => {
      const target = document.getElementById(button.dataset.copy ?? '');
      if (!target) return;
      const status = document.getElementById(button.dataset.copyStatus ?? '');
      button.style.minWidth = `${originalWidth}px`;
      try {
        await navigator.clipboard.writeText(
          target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement
            ? target.value
            : (target.textContent?.trim() ?? ''),
        );
        button.textContent = 'Copied';
        if (status) status.textContent = '';
      } catch {
        button.textContent = 'Copy failed';
        if (status)
          status.textContent = 'Copy failed. Download the public key instead.';
      }
    });
  });

document.querySelectorAll<HTMLAnchorElement>('a[download]').forEach((link) => {
  const label = link.textContent;
  const originalWidth = link.getBoundingClientRect().width;
  let reset: ReturnType<typeof setTimeout>;
  link.setAttribute('aria-live', 'polite');
  link.addEventListener('click', () => {
    clearTimeout(reset);
    link.style.minWidth = `${originalWidth}px`;
    link.textContent = 'Downloading';
    reset = setTimeout(() => {
      link.textContent = label;
    }, 2000);
  });
});

console.info(siteSignature);

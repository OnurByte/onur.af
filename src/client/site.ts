import { siteSignature } from '../portfolio/signature';

document.addEventListener('contextmenu', (event) => event.preventDefault());
document.addEventListener('copy', (event) => event.preventDefault());

const codeCopyTemplate = document.querySelector<HTMLTemplateElement>(
  'template[data-log-code-copy]',
);
if (codeCopyTemplate) {
  document
    .querySelectorAll<HTMLElement>('.log-body pre > code')
    .forEach((code, index) => {
      const pre = code.parentElement!;
      pre.tabIndex = 0;
      const wrapper = codeCopyTemplate.content.firstElementChild!.cloneNode(
        true,
      ) as HTMLElement;
      const button = wrapper.querySelector<HTMLButtonElement>('button')!;
      code.id = `log-code-${index}`;
      button.dataset.copy = code.id;
      pre.before(wrapper);
      wrapper.append(pre);
    });
}

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
            : target instanceof HTMLElement && target.matches('code')
              ? (target.textContent ?? '')
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

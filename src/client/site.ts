import { siteSignature } from '../portfolio/signature';
import { initSmoothScroll } from './smooth-scroll';
import { initNavGlass } from './nav-glass';

initSmoothScroll();
// Present the readable native navbar and primary content before generating
// its decorative displacement map. Navigation is usable throughout.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    if ('requestIdleCallback' in window)
      window.requestIdleCallback(() => initNavGlass(), { timeout: 1000 });
    else initNavGlass();
  });
});

document.addEventListener('contextmenu', (event) => {
  if (!(event.target instanceof Element && event.target.closest('.h-entry')))
    event.preventDefault();
});
document.addEventListener('copy', (event) => {
  const anchor = window.getSelection()?.anchorNode;
  const element = anchor instanceof Element ? anchor : anchor?.parentElement;
  if (!element?.closest('.h-entry')) event.preventDefault();
});

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
      button.dataset['copy'] = code.id;
      pre.before(wrapper);
      wrapper.append(pre);
    });
}

document
  .querySelectorAll<HTMLButtonElement>('[data-copy]')
  .forEach((button) => {
    const bounds = button.getBoundingClientRect();
    const originalWidth = bounds.width;
    const computed = getComputedStyle(button);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) context.font = computed.font;
    const fontSize = parseFloat(computed.fontSize);
    const horizontalSpace =
      parseFloat(computed.paddingLeft) +
      parseFloat(computed.paddingRight) +
      parseFloat(computed.borderLeftWidth) +
      parseFloat(computed.borderRightWidth);
    const failureTextWidth = context
      ? context.measureText('Copy failed').width
      : 0;
    const availableTextWidth = originalWidth - horizontalSpace;
    const failureFontSize =
      context && failureTextWidth > availableTextWidth
        ? `${(fontSize * Math.max(0, availableTextWidth - 1)) / failureTextWidth}px`
        : computed.fontSize;
    button.style.width = `${originalWidth}px`;
    button.style.height = `${bounds.height}px`;
    button.style.whiteSpace = 'nowrap';
    button.setAttribute('aria-live', 'polite');
    button.addEventListener('click', () => {
      void copy();
    });
    async function copy() {
      const target = document.getElementById(button.dataset['copy'] ?? '');
      if (!target) return;
      const status = document.getElementById(
        button.dataset['copyStatus'] ?? '',
      );
      try {
        await navigator.clipboard.writeText(
          target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement
            ? target.value
            : target instanceof HTMLElement && target.matches('code')
              ? (target.textContent ?? '')
              : (target.textContent?.trim() ?? ''),
        );
        button.style.fontSize = computed.fontSize;
        button.textContent = 'Copied';
        if (status) status.textContent = '';
      } catch {
        button.style.fontSize = failureFontSize;
        button.textContent = 'Copy failed';
        if (status)
          status.textContent = 'Copy failed. Download the public key instead.';
      }
    }
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

import { openDialog, closeDialog } from './dialogs';
const trigger = document.querySelector<HTMLButtonElement>('#open-share');
const dialog = document.querySelector<HTMLDialogElement>('#share-dialog');
const query = document.querySelector<HTMLInputElement>('#share-query');
const rows = [
  ...(dialog?.querySelectorAll<HTMLElement>('[data-share-label]') ?? []),
];
function filterActions() {
  const term = query?.value.trim().toLowerCase() ?? '';
  let count = 0;
  for (const row of rows) {
    row.hidden =
      (row.hasAttribute('data-native-row') &&
        typeof navigator.share !== 'function') ||
      !row.dataset['shareLabel']!.includes(term);
    if (!row.hidden) count++;
  }
  if (status) {
    status.textContent = count ? '' : 'No results';
    status.hidden = count > 0;
  }
}
query?.addEventListener('input', filterActions);
const status = document.querySelector<HTMLElement>('#share-status');
function open() {
  if (!dialog) return;
  if (status) {
    status.textContent = '';
    status.hidden = true;
  }
  if (query) query.value = '';
  filterActions();
  openDialog(dialog, trigger);
  const viewport = dialog.querySelector<HTMLElement>('[data-dialog-scroll]');
  if (viewport) viewport.scrollTop = 0;
  query?.focus();
}
if (trigger && dialog) trigger.parentElement?.removeAttribute('hidden');
trigger?.addEventListener('click', open);
if (typeof navigator.share === 'function')
  dialog
    ?.querySelector<HTMLElement>('[data-native-row]')
    ?.removeAttribute('hidden');
// Wait for release so Ctrl+Shift plus another key never opens Share.
let shareChord = false;
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Control' && event.key !== 'Shift') {
    shareChord = false;
    return;
  }
  if (event.repeat) return;
  const target = event.target;
  const editing =
    target instanceof Element &&
    target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
    ) &&
    !target.closest('#search-dialog, #share-dialog');
  shareChord =
    !event.defaultPrevented &&
    !event.isComposing &&
    !editing &&
    !event.altKey &&
    !event.metaKey &&
    event.ctrlKey &&
    event.shiftKey;
});
document.addEventListener('keyup', (event) => {
  if (!shareChord || (event.key !== 'Control' && event.key !== 'Shift')) return;
  shareChord = false;
  if (dialog?.open) closeDialog(dialog);
  else open();
});
window.addEventListener('blur', () => {
  shareChord = false;
});
dialog?.addEventListener('click', async (event) => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      closeDialog(dialog);
    return;
  }
  if ((event.target as Element).closest('a[href]')) {
    closeDialog(dialog);
    return;
  }
  const action = (event.target as Element).closest<HTMLElement>(
    '[data-share-action]',
  )?.dataset['shareAction'];
  if (!action || !status) return;
  status.textContent = '';
  status.hidden = true;
  const url = dialog.dataset['url']!;
  try {
    if (action === 'native') {
      await navigator.share({ title: dialog.dataset['title']!, url });
      closeDialog(dialog);
      return;
    }
    if (action === 'discord') {
      const isMobile =
        /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) ||
        (navigator.maxTouchPoints > 1 &&
          /Macintosh/i.test(navigator.userAgent));
      if (isMobile && typeof navigator.share === 'function') {
        await navigator.share({ title: dialog.dataset['title']!, url });
        closeDialog(dialog);
        return;
      }

      let copy: Promise<void> | undefined;
      try {
        copy = navigator.clipboard?.writeText(url);
      } catch {
        // Still open Discord if the browser blocks clipboard access.
      }
      window.open('discord://-/channels/@me', '_blank', 'noopener,noreferrer');
      if (!copy) throw new Error('Clipboard unavailable');
      await copy;
      closeDialog(dialog);
      return;
    }
    await navigator.clipboard.writeText(url);
    closeDialog(dialog);
  } catch (error) {
    if (
      (action === 'native' || action === 'discord') &&
      error instanceof DOMException &&
      error.name === 'AbortError'
    )
      return;
    status.hidden = false;
    status.textContent =
      action === 'native'
        ? 'Could not open sharing. Try Copy link.'
        : action === 'discord'
          ? 'Copy failed. Copy the address from your browser and paste it into Discord.'
          : 'Copy failed. Copy the address from your browser.';
  }
});
dialog?.addEventListener('keydown', (event) => {
  if (event.isComposing) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeDialog(dialog);
    return;
  }
  if (event.key === 'Enter' && event.target === query) {
    event.preventDefault();
    dialog
      .querySelector<HTMLElement>('li:not([hidden]) a, li:not([hidden]) button')
      ?.click();
    return;
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const actions = [
    ...dialog.querySelectorAll<HTMLElement>(
      'li:not([hidden]) a, li:not([hidden]) button',
    ),
  ];
  if (!actions.length) return;
  event.preventDefault();
  const index = actions.indexOf(document.activeElement as HTMLElement);
  if (index < 0) {
    actions[event.key === 'ArrowDown' ? 0 : actions.length - 1]?.focus();
    return;
  }
  actions[
    (index + (event.key === 'ArrowDown' ? 1 : -1) + actions.length) %
      actions.length
  ]?.focus();
});

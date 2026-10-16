import { openDialog, closeDialog } from './dialogs';
const trigger = document.querySelector<HTMLButtonElement>('#open-share');
const dialog = document.querySelector<HTMLDialogElement>('#share-dialog');
const status = document.querySelector<HTMLElement>('#share-status');
function open() {
  if (!dialog) return;
  if (status) {
    status.textContent = '';
    status.hidden = true;
  }
  openDialog(dialog, trigger);
  dialog.querySelector<HTMLAnchorElement>('a')?.focus();
}
if (trigger && dialog) trigger.hidden = false;
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
    !target.closest('#search-dialog');
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
  const action = (event.target as Element).closest<HTMLElement>(
    '[data-share-action]',
  )?.dataset.shareAction;
  if (!action || !status) return;
  status.textContent = '';
  status.hidden = true;
  const url = dialog.dataset.url!;
  try {
    if (action === 'native') {
      await navigator.share({ title: dialog.dataset.title!, url });
      return;
    }
    await navigator.clipboard.writeText(
      action === 'citation' ? dialog.dataset.citation! : url,
    );
  } catch (error) {
    if (
      action === 'native' &&
      error instanceof DOMException &&
      error.name === 'AbortError'
    )
      return;
    status.hidden = false;
    status.textContent =
      action === 'native'
        ? 'Could not open sharing. Try Copy link.'
        : 'Copy failed. Copy the address from your browser.';
  }
});
dialog?.addEventListener('keydown', (event) => {
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

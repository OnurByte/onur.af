const returnFocus = new WeakMap<HTMLDialogElement, HTMLElement>();
let active: HTMLDialogElement | undefined;
export function openDialog(
  dialog: HTMLDialogElement,
  trigger: HTMLElement | null,
) {
  if (active && active !== dialog) {
    returnFocus.delete(active);
    active.close();
  }
  if (trigger) returnFocus.set(dialog, trigger);
  active = dialog;
  if (!dialog.open) dialog.showModal();
  dialog.addEventListener(
    'close',
    () => {
      if (active === dialog) active = undefined;
      const target = returnFocus.get(dialog);
      returnFocus.delete(dialog);
      if (!active?.open) target?.focus();
    },
    { once: true },
  );
}
export function closeDialog(dialog: HTMLDialogElement) {
  dialog.close();
}

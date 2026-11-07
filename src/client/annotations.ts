import { z } from 'astro/zod';
import { mergeOwned } from '../portfolio/annotations/management';
import { required } from '../portfolio/required';
import { initPublishedNotes } from './annotation-notes';
import { initSelectionActions } from './annotation-selection';
import {
  currentPublicKey,
  encode,
  formText,
  initAnnotationBackup,
  keys,
  storedNotes,
} from './annotation-identity';
import {
  annotationBytes,
  annotationSchema,
  type AnnotationPayload,
  type TextTarget,
} from '../portfolio/annotations/protocol';

export function initAnnotations(): void {
  for (const root of document.querySelectorAll<HTMLElement>(
    '[data-annotations]',
  )) {
    const article = root.closest('article');
    const body = article?.querySelector<HTMLElement>(
      `[data-annotation-revision="${required(root.dataset['revision'])}"]`,
    );
    const form = root.querySelector<HTMLFormElement>('[data-annotation-form]');
    const status = root.querySelector<HTMLElement>('[data-annotation-status]');
    if (!body || !form || !status) continue;
    const controls = root.querySelector<HTMLElement>(
      '[data-annotation-controls]',
    );
    if (controls) controls.hidden = false;
    initAnnotationBackup(root);
    let target: TextTarget | undefined;
    let editing: AnnotationPayload | undefined;
    let reporting = false;
    const draftKey = `annotation-draft:${required(root.dataset['log'])}:v${required(root.dataset['revision'])}`;
    const draftSchema = z.object({
      target: annotationSchema.shape.target,
      body: z.string().max(2000),
    });
    function savedDraft() {
      try {
        return draftSchema.parse(
          JSON.parse(localStorage.getItem(draftKey) ?? 'null'),
        );
      } catch {
        return null;
      }
    }
    function openComposer(): void {
      if (!form || !body || !target) return;
      const pgp = form.querySelector<HTMLTextAreaElement>('[name="pgp"]');
      const pgpLabel = root.querySelector<HTMLElement>(
        '[data-annotation-pgp-label]',
      );
      if (pgpLabel) pgpLabel.hidden = reporting;
      if (pgp) {
        pgp.required = !reporting && !editing;
        pgp.value =
          editing?.pgpPublicKey ??
          localStorage.getItem('annotation-pgp-public-key') ??
          '';
      }
      const quote = root.querySelector<HTMLElement>('[data-annotation-quote]');
      if (quote) quote.textContent = target.quote.exact;
      const draft = savedDraft();
      if (
        !editing &&
        !reporting &&
        draft &&
        JSON.stringify(draft.target) === JSON.stringify(target)
      )
        required(
          form.querySelector<HTMLTextAreaElement>('[name="note"]'),
        ).value = draft.body;
      const rect =
        picker.range()?.getBoundingClientRect() ?? body.getBoundingClientRect();
      const bodyRect = body.getBoundingClientRect();
      const width = Math.min(360, innerWidth - 40);
      const x =
        innerWidth - bodyRect.right > width + 24
          ? bodyRect.right + 16
          : Math.max(20, Math.min(innerWidth - width - 20, rect.left));
      form.style.setProperty('--annotation-panel-x', `${String(x)}px`);
      form.style.setProperty(
        '--annotation-panel-y',
        `${String(Math.max(112, Math.min(innerHeight - 320, rect.bottom + 16)))}px`,
      );
      for (const note of root.querySelectorAll<HTMLElement>(
        '[data-annotation-marker]',
      )) {
        note.hidden =
          Number(note.dataset['end']) <= target.position.start ||
          Number(note.dataset['start']) >= target.position.end;
      }
      const related = root.querySelector<HTMLElement>(
        '[data-annotation-related]',
      );
      if (related)
        related.hidden = !root.querySelector(
          '[data-annotation-marker]:not([hidden])',
        );
      form.hidden = false;
      form.showPopover();
      const height = form.getBoundingClientRect().height;
      form.style.setProperty(
        '--annotation-panel-y',
        `${String(Math.max(112, Math.min(innerHeight - height - 20, rect.bottom + 16)))}px`,
      );
      form.querySelector('textarea')?.focus();
    }
    function closeComposer(restore = false): void {
      if (!form) return;
      form.hidePopover();
      form.hidden = true;
      document.dispatchEvent(new CustomEvent('annotation-focus'));
      if (restore) picker.restore();
    }
    form.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeComposer(true);
      }
    });
    form.addEventListener('input', () => {
      if (!target || editing || reporting) return;
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ target, body: formText(form, 'note') }),
        );
      } catch {
        /* Draft saving is optional. */
      }
    });
    function updateAction(): void {
      if (!form) return;
      const button = form.querySelector<HTMLButtonElement>('[type="submit"]');
      const label = form.querySelector<HTMLElement>('[data-annotation-action]');
      if (label) label.hidden = !editing || reporting;
      if (button)
        button.textContent = reporting
          ? 'Send report'
          : editing
            ? formText(form, 'action') === 'withdraw'
              ? 'Withdraw annotation'
              : 'Save changes'
            : 'Publish annotation';
    }
    form.addEventListener('change', updateAction);
    const ownKey = `annotation-own:${required(root.dataset['log'])}`;
    function readOwn(): AnnotationPayload[] {
      return storedNotes(localStorage.getItem(ownKey));
    }
    let own: AnnotationPayload[] = [];
    function syncOwn(): void {
      try {
        own = readOwn();
      } catch {
        /* Invalid local metadata cannot grant ownership. */
      }
    }
    syncOwn();
    window.addEventListener('annotation-owned-changed', syncOwn);
    window.addEventListener('storage', (event) => {
      if (event.key === ownKey) syncOwn();
    });
    const picker = initSelectionActions({
      root,
      body,
      form,
      onAnnotate(selected) {
        target = selected;
        editing = undefined;
        reporting = false;
        updateAction();
        openComposer();
      },
    });
    root
      .querySelector('[data-annotation-cancel]')
      ?.addEventListener('click', () => {
        closeComposer(true);
        target = undefined;
      });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void submit();
    });
    let sending = false;
    async function submit(): Promise<void> {
      if (!target || !form || !status || sending) return;
      sending = true;
      try {
        const pgp = formText(form, 'pgp').trim();
        if (!reporting && (pgp || !editing)) {
          const valid = annotationSchema.shape.pgpPublicKey.safeParse(pgp);
          if (!valid.success) {
            status.textContent =
              'Paste a PGP public key beginning with BEGIN PGP PUBLIC KEY BLOCK.';
            form.querySelector<HTMLTextAreaElement>('[name="pgp"]')?.focus();
            return;
          }
        }
        const key = await keys();
        const payload: AnnotationPayload = {
          format: 'onur-annotation-v1',
          id: editing?.id ?? crypto.randomUUID(),
          logId: required(root.dataset['log']),
          revision: Number(root.dataset['revision']),
          revisionHash: required(root.dataset['revisionHash']),
          target,
          body: formText(form, 'note'),
          action: reporting
            ? 'report'
            : editing
              ? formText(form, 'action') === 'withdraw'
                ? 'withdraw'
                : 'edit'
              : 'create',
          sequence: (editing?.sequence ?? 0) + 1,
          publicKey: key.publicKey,
          ...(!reporting && pgp ? { pgpPublicKey: pgp } : {}),
        };
        const signature = encode(
          await crypto.subtle.sign(
            'Ed25519',
            key.privateKey,
            new TextEncoder().encode(annotationBytes(payload)),
          ),
        );
        const response = await fetch('/api/annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload, signature }),
        });
        if (!response.ok) throw new Error('Unavailable');
        if (!reporting) {
          if (pgp) localStorage.setItem('annotation-pgp-public-key', pgp);
          const latest = readOwn();
          own = mergeOwned(latest, [payload]);
          localStorage.setItem(ownKey, JSON.stringify(own));
          window.dispatchEvent(new Event('annotation-owned-changed'));
          window.dispatchEvent(new Event('annotation-published-changed'));
        }
        closeComposer();
        if (!editing && !reporting) {
          localStorage.removeItem(draftKey);
        }
        form.reset();
        target = undefined;
        status.textContent =
          payload.action === 'withdraw'
            ? 'Annotation withdrawn.'
            : payload.action === 'report'
              ? 'Report submitted.'
              : 'Annotation published.';
      } catch {
        status.textContent =
          'Annotation could not be submitted. Your note is still here.';
      } finally {
        sending = false;
      }
    }
    const noteViewer = root.querySelector<HTMLElement>(
      '[data-annotation-viewer]',
    );
    noteViewer?.addEventListener('toggle', () => {
      if (!noteViewer.matches(':popover-open'))
        document.dispatchEvent(new CustomEvent('annotation-focus'));
    });
    const notes = initPublishedNotes({
      root,
      body,
      viewer: noteViewer,
      isOwn: (note) =>
        own.some(
          (p) =>
            p.id === note.id &&
            p.publicKey === note.publicKey &&
            currentPublicKey() === note.publicKey,
        ),
      onReport(note) {
        editing = note;
        reporting = true;
        updateAction();
        target = note.target;
        required(
          form.querySelector<HTMLTextAreaElement>('[name="note"]'),
        ).value = '';
        openComposer();
        status.textContent = 'Describe the issue and submit your report.';
      },
      onManage(note, action) {
        editing = note;
        reporting = false;
        target = note.target;
        required(
          form.querySelector<HTMLTextAreaElement>('[name="note"]'),
        ).value = note.body;
        required(
          form.querySelector<HTMLSelectElement>('[name="action"]'),
        ).value = action;
        if (action === 'withdraw') void submit();
        else {
          updateAction();
          openComposer();
        }
      },
    });
    const enabled = root.dataset['annotationEnabled'] === 'true';
    if (enabled) void notes.reload();
    window.addEventListener('annotation-published-changed', () => {
      if (enabled) void notes.reload();
    });
  }
}

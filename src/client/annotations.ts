import {
  locateAnnotation,
  webAnnotation,
} from '../portfolio/annotations/web-annotation';
import { z } from 'astro/zod';
import { annotationSchema } from '../portfolio/annotations/protocol';
import {
  savedKeysSchema,
  mergeOwned,
} from '../portfolio/annotations/management';
function formText(form: HTMLFormElement, name: string): string {
  const value = new FormData(form).get(name);
  return typeof value === 'string' ? value : '';
}
import { required } from '../portfolio/required';
import {
  anchorSelection,
  annotationBytes,
  type AnnotationPayload,
  type TextTarget,
} from '../portfolio/annotations/protocol';
const encode = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)));
interface SavedKeys {
  privateKey: JsonWebKey;
  publicKey: string;
}
async function keys(): Promise<{
  privateKey: CryptoKey;
  publicKey: string;
}> {
  const raw = localStorage.getItem('annotation-key-v1');
  if (raw) {
    const saved = savedKeysSchema.parse(JSON.parse(raw));
    return {
      privateKey: await crypto.subtle.importKey(
        'jwk',
        saved.privateKey,
        { name: 'Ed25519' },
        false,
        ['sign'],
      ),
      publicKey: saved.publicKey,
    };
  }
  const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
    'sign',
    'verify',
  ]);
  const saved: SavedKeys = {
    privateKey: await crypto.subtle.exportKey('jwk', pair.privateKey),
    publicKey: encode(await crypto.subtle.exportKey('spki', pair.publicKey)),
  };
  localStorage.setItem('annotation-key-v1', JSON.stringify(saved));
  return { privateKey: pair.privateKey, publicKey: saved.publicKey };
}
function cleanText(node: Node): string {
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentElement?.closest('button,template,[data-annotation-marker]')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  let text = '';
  let next: Node | null;
  while ((next = walker.nextNode())) text += next.textContent ?? '';
  return text;
}
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
    let target: TextTarget | undefined;
    let editing: AnnotationPayload | undefined;
    let reporting = false;
    let selectedRange: Range | undefined;
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
        selectedRange?.getBoundingClientRect() ?? body.getBoundingClientRect();
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
      if (restore && selectedRange) {
        const selection = getSelection();
        selection?.removeAllRanges();
        selection?.addRange(selectedRange.cloneRange());
        captureSelection();
        selectButton?.focus({ preventScroll: true });
      }
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
      return z
        .array(annotationSchema)
        .parse(JSON.parse(localStorage.getItem(ownKey) ?? '[]'));
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
    const selectButton = root.querySelector<HTMLButtonElement>(
      '[data-annotation-select]',
    );
    let selectedTarget: TextTarget | undefined;
    let selecting = false;
    function captureSelection(): void {
      if (!selectButton || !body) return;
      const selection = getSelection();
      if (
        selecting ||
        !selection?.rangeCount ||
        selection.isCollapsed ||
        !body.contains(selection.getRangeAt(0).commonAncestorContainer)
      ) {
        selectButton.hidden = true;
        return;
      }
      if (form?.matches(':popover-open')) return;
      const range = selection.getRangeAt(0);
      selectedRange = range.cloneRange();
      try {
        const before = document.createRange();
        before.selectNodeContents(body);
        before.setEnd(range.startContainer, range.startOffset);
        const start = cleanText(before.cloneContents()).length;
        selectedTarget = anchorSelection(
          cleanText(body),
          start,
          start + cleanText(range.cloneContents()).length,
        );
        const edge = document.createRange();
        if (selection.focusNode) {
          edge.setStart(selection.focusNode, selection.focusOffset);
          edge.collapse(true);
        }
        const visibleRects = Array.from(range.getClientRects()).filter(
          (rect) => rect.bottom > 112 && rect.top < innerHeight - 20,
        );
        const focusRect = edge.getClientRects()[0];
        const rect =
          focusRect &&
          focusRect.bottom > 112 &&
          focusRect.top < innerHeight - 20
            ? focusRect
            : (visibleRects.at(-1) ?? range.getBoundingClientRect());
        selectButton.style.setProperty(
          '--annotation-x',
          `${String(Math.max(20, Math.min(innerWidth - 200, rect.left)))}px`,
        );
        selectButton.style.setProperty(
          '--annotation-y',
          `${String(rect.bottom + 64 <= innerHeight ? Math.max(112, rect.bottom + 16) : Math.max(112, rect.top - 64))}px`,
        );
        selectButton.hidden = rect.bottom < 100 || rect.top > innerHeight;
      } catch {
        selectButton.hidden = true;
      }
    }
    if (selectButton) {
      selectButton.hidden = true;
      document.addEventListener('selectionchange', captureSelection);
      document.addEventListener('pointerdown', (event) => {
        if (event.target instanceof Node && body.contains(event.target)) {
          selecting = true;
          selectButton.hidden = true;
        }
      });
      document.addEventListener('pointerup', () => {
        if (!selecting) return;
        selecting = false;
        captureSelection();
      });
      document.addEventListener('pointercancel', () => {
        selecting = false;
        captureSelection();
      });
      selectButton.addEventListener('pointerdown', (event) => {
        event.preventDefault();
      });
      window.addEventListener(
        'scroll',
        () => {
          if (!selectButton.hidden) captureSelection();
        },
        { passive: true },
      );
      selectButton.addEventListener('click', () => {
        if (!selectedTarget) return;
        target = selectedTarget;
        editing = undefined;
        reporting = false;
        updateAction();
        selectButton.hidden = true;
        openComposer();
      });
    }
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
    let loadSequence = 0;
    async function loadPublished(): Promise<void> {
      if (!body || !form || !status) return;
      const sequence = ++loadSequence;
      try {
        const response = await fetch(
          `/api/annotations?${new URLSearchParams({ log: required(root.dataset['log']), v: required(root.dataset['revision']) })}`,
        );
        if (!response.ok) return;
        const data = z
          .object({ annotations: z.array(annotationSchema) })
          .parse(await response.json());
        if (sequence !== loadSequence) return;
        root.querySelectorAll('[data-annotation-marker]').forEach((marker) => {
          marker.remove();
        });
        const viewer = root.querySelector<HTMLElement>(
          '[data-annotation-viewer]',
        );
        const template = root.querySelector<HTMLTemplateElement>(
          '[data-annotation-marker-template]',
        );
        const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
          acceptNode: (n) =>
            n.parentElement?.closest('button,template')
              ? NodeFilter.FILTER_REJECT
              : NodeFilter.FILTER_ACCEPT,
        });
        const nodes: Node[] = [];
        let node: Node | null;
        while ((node = walker.nextNode())) nodes.push(node);
        for (const note of data.annotations) {
          if (note.revisionHash !== root.dataset['revisionHash']) continue;
          const position = locateAnnotation(cleanText(body), note.target);
          if (!position) continue;
          let offset = 0;
          const endNode = nodes.find((n) => {
            offset += (n.textContent ?? '').length;
            return offset >= position.end;
          });
          const anchor = endNode?.parentElement?.closest(
            'p,li,h2,h3,h4,blockquote,pre',
          );
          const marker = template?.content.firstElementChild?.cloneNode(true);
          if (!anchor || !(marker instanceof HTMLButtonElement) || !viewer)
            continue;
          marker.dataset['annotationId'] = note.id;
          marker.dataset['start'] = String(position.start);
          marker.dataset['end'] = String(position.end);
          marker.textContent = `Read note: ${note.body.slice(0, 60)}`;
          marker.hidden = true;
          marker.setAttribute(
            'aria-label',
            `Read annotation on ${note.target.quote.exact.slice(0, 80)}`,
          );
          marker.addEventListener('click', () => {
            const focus = document.createRange();
            let base = 0;
            let started = false;
            for (const node of nodes) {
              const length = node.textContent?.length ?? 0;
              if (!started && position.start <= base + length) {
                focus.setStart(node, Math.max(0, position.start - base));
                started = true;
              }
              if (started && position.end <= base + length) {
                focus.setEnd(node, Math.max(0, position.end - base));
                break;
              }
              base += length;
            }
            document.dispatchEvent(
              new CustomEvent('annotation-focus', { detail: focus }),
            );

            const quote = document.createElement('blockquote');
            quote.textContent = note.target.quote.exact;
            const noteBody = document.createElement('p');
            noteBody.textContent = note.body;
            const actionTemplate = root.querySelector<HTMLTemplateElement>(
              '[data-annotation-action-template]',
            );
            const report = document.createElement('button');
            const actionClass =
              actionTemplate?.content.firstElementChild?.className;
            if (typeof actionClass === 'string') report.className = actionClass;
            report.type = 'button';
            report.textContent = 'Report annotation';
            report.addEventListener('click', () => {
              editing = note;
              reporting = true;
              updateAction();
              target = note.target;
              required(
                form.querySelector<HTMLTextAreaElement>('[name="note"]'),
              ).value = '';
              viewer.hidePopover();
              openComposer();
              status.textContent = 'Describe the issue and submit your report.';
            });
            const download = document.createElement('button');
            download.type = 'button';
            download.textContent = 'Download annotation';
            if (typeof actionClass === 'string')
              download.className = actionClass;
            download.addEventListener('click', () => {
              const canonical = document.querySelector<HTMLLinkElement>(
                'link[rel="canonical"]',
              )?.href;
              const source = new URL(
                `/log/${note.logId}`,
                canonical ?? location.origin,
              );
              source.hash = `${note.logId}-v${String(note.revision)}-body`;
              const url = URL.createObjectURL(
                new Blob(
                  [
                    JSON.stringify(
                      webAnnotation(note, source.href, cleanText(body)),
                      null,
                      2,
                    ),
                  ],
                  { type: 'application/ld+json' },
                ),
              );
              const link = document.createElement('a');
              link.href = url;
              link.download = `annotation-${note.id}.jsonld`;
              link.click();
              setTimeout(() => {
                URL.revokeObjectURL(url);
              }, 1000);
            });
            const close = document.createElement('button');
            close.type = 'button';
            close.textContent = 'Close annotation';
            if (typeof actionClass === 'string') close.className = actionClass;
            close.addEventListener('click', () => {
              viewer.hidePopover();
              marker.focus();
            });
            const actions: HTMLButtonElement[] = [];
            if (
              own.some(
                (p) => p.id === note.id && p.publicKey === note.publicKey,
              )
            ) {
              for (const action of ['edit', 'withdraw'] as const) {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent =
                  action === 'edit' ? 'Edit annotation' : 'Withdraw annotation';
                if (typeof actionClass === 'string')
                  button.className = actionClass;
                button.addEventListener('click', () => {
                  editing = note;
                  reporting = false;
                  target = note.target;
                  required(
                    form.querySelector<HTMLTextAreaElement>('[name="note"]'),
                  ).value = note.body;
                  required(
                    form.querySelector<HTMLSelectElement>('[name="action"]'),
                  ).value = action;
                  viewer.hidePopover();
                  if (action === 'withdraw') void submit();
                  else {
                    updateAction();
                    openComposer();
                  }
                });
                actions.push(button);
              }
            }
            viewer.replaceChildren(
              quote,
              noteBody,
              ...actions,
              report,
              download,
              close,
            );
            viewer.showPopover();
          });
          root.querySelector('[data-annotation-notes]')?.append(marker);
        }
      } catch {
        /* Article remains readable. */
      }
    }
    void loadPublished();
    window.addEventListener('annotation-published-changed', () => {
      void loadPublished();
    });
  }
}

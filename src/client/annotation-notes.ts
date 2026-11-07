import { z } from 'astro/zod';
import {
  locateAnnotation,
  webAnnotation,
  type AnnotationTimeState,
} from '../portfolio/annotations/web-annotation';
import {
  annotationSchema,
  type AnnotationPayload,
} from '../portfolio/annotations/protocol';
import { required } from '../portfolio/required';
import { cleanText } from './annotation-selection';
import { downloadBlob } from './download';

function actionButton(
  label: string,
  className: string | undefined,
  onClick: () => void,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  if (className) button.className = className;
  button.addEventListener('click', onClick);
  return button;
}
/** The Memento path resolves against the exported source so both share one origin. */
function timeState(
  data: DOMStringMap,
  origin: string,
): AnnotationTimeState | undefined {
  const {
    revisionHash,
    projectionVersion,
    projectionHash,
    archivedAt,
    mementoPath,
  } = data;
  if (
    !revisionHash ||
    !projectionVersion ||
    !projectionHash ||
    !archivedAt ||
    !mementoPath
  )
    return undefined;
  return {
    revisionHash,
    projectionVersion,
    projectionHash,
    archivedAt,
    memento: new URL(mementoPath, origin).href,
  };
}

/** Published notes for one revision: inline markers that open a viewer with report, download and manage actions. */
export function initPublishedNotes({
  root,
  body,
  viewer,
  isOwn,
  onReport,
  onManage,
}: {
  root: HTMLElement;
  body: HTMLElement;
  viewer: HTMLElement | null;
  /** Whether the reader holds the signing key that published `note`. */
  isOwn: (note: AnnotationPayload) => boolean;
  onReport: (note: AnnotationPayload) => void;
  onManage: (note: AnnotationPayload, action: 'edit' | 'withdraw') => void;
}): { reload(): Promise<void> } {
  let loadSequence = 0;
  async function reload(): Promise<void> {
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
          const actionClass = root.querySelector<HTMLTemplateElement>(
            '[data-annotation-action-template]',
          )?.content.firstElementChild?.className;
          const report = actionButton('Report annotation', actionClass, () => {
            viewer.hidePopover();
            onReport(note);
          });
          const download = actionButton(
            'Download annotation',
            actionClass,
            () => {
              const canonical = document.querySelector<HTMLLinkElement>(
                'link[rel="canonical"]',
              )?.href;
              const source = new URL(
                `/log/${note.logId}`,
                canonical ?? location.origin,
              );
              source.hash = `${note.logId}-v${String(note.revision)}-body`;
              downloadBlob(
                new Blob(
                  [
                    JSON.stringify(
                      webAnnotation(
                        note,
                        source.href,
                        cleanText(body),
                        timeState(root.dataset, source.origin),
                      ),
                      null,
                      2,
                    ),
                  ],
                  { type: 'application/ld+json' },
                ),
                `annotation-${note.id}.jsonld`,
              );
            },
          );
          const close = actionButton('Close annotation', actionClass, () => {
            viewer.hidePopover();
            marker.focus();
          });
          const actions = isOwn(note)
            ? (['edit', 'withdraw'] as const).map((action) =>
                actionButton(
                  action === 'edit' ? 'Edit annotation' : 'Withdraw annotation',
                  actionClass,
                  () => {
                    viewer.hidePopover();
                    onManage(note, action);
                  },
                ),
              )
            : [];
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
  return { reload };
}

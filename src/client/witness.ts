import { required } from '../portfolio/required';
import { z } from 'astro/zod';
function isVisible(): boolean {
  return document.visibilityState === 'visible';
}
export function initWitness(): void {
  const container = document.querySelector<HTMLElement>('[data-witness-log]');
  const button = container?.querySelector<HTMLButtonElement>(
    '[data-witness-opt-in]',
  );
  const status = container?.querySelector<HTMLElement>('[data-witness-status]');
  if (!container || !button || !status) return;
  const logId = required(container.dataset['witnessLog']);
  if (location.pathname !== `/log/${logId}`) return;
  const privacyDeclined =
    navigator.doNotTrack === '1' ||
    ('globalPrivacyControl' in navigator &&
      navigator.globalPrivacyControl === true);
  if (privacyDeclined) {
    status.textContent =
      'Measurement disabled by your browser privacy preference.';
  }
  button.disabled = privacyDeclined;
  button.addEventListener('click', () => {
    void measure();
  });
  let controls: HTMLElement | undefined;
  try {
    const stored = localStorage.getItem(`witness-receipt:${logId}`);
    if (stored) {
      const saved = z
        .object({
          eventId: z.uuid(),
          token: z.string().regex(/^[a-f0-9]{64}$/),
        })
        .parse(JSON.parse(stored));
      showReceipt(saved.eventId, saved.token);
    }
  } catch {
    /* Receipt storage is optional. */
  }
  function showReceipt(eventId: string, receiptToken: string): void {
    if (!container || !status || !button) return;
    controls?.remove();
    controls = document.createElement('div');
    const download = document.createElement('button');
    download.type = 'button';
    download.className = button.className;
    download.textContent = 'Download receipt';
    download.addEventListener('click', () => {
      void (async () => {
        try {
          const response = await fetch(`/api/witness/receipts/${eventId}`, {
            headers: { Authorization: `Bearer ${receiptToken}` },
          });
          if (!response.ok) throw new Error('Unavailable');
          const url = URL.createObjectURL(await response.blob());
          const link = document.createElement('a');
          link.href = url;
          link.download = `witness-${eventId}.json`;
          link.click();
          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 1000);
        } catch {
          status.textContent = 'Receipt unavailable. Try again later.';
        }
      })();
    });
    const forget = document.createElement('button');
    forget.type = 'button';
    forget.className = button.className;
    forget.textContent = 'Delete matching data';
    forget.addEventListener('click', () => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/witness/receipts/${eventId}/forget`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${receiptToken}` },
            },
          );
          if (!response.ok) throw new Error('Unavailable');
          localStorage.removeItem(`witness-receipt:${logId}`);
          sessionStorage.removeItem(`witness-request:${logId}`);
          controls?.remove();
          status.textContent =
            'Matching identifiers deleted. Public evidence remains. A later visit can count again.';
        } catch {
          status.textContent = 'Deletion unavailable. You can try again.';
        }
      })();
    });
    controls.append(download, forget);
    container.append(controls);
  }
  async function measure(): Promise<void> {
    if (
      privacyDeclined ||
      document.visibilityState !== 'visible' ||
      !container ||
      !button ||
      !status
    )
      return;
    button.disabled = true;
    try {
      const { load } = await import('@fingerprintjs/fingerprintjs');
      const agent = await load({ monitoring: false });
      const fingerprint = await agent.get();
      if (!isVisible()) {
        button.disabled = false;
        return;
      }
      const storageKey = `witness-request:${logId}`;
      let token = sessionStorage.getItem(storageKey);
      if (!token) {
        token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (v) =>
          v.toString(16).padStart(2, '0'),
        ).join('');
        sessionStorage.setItem(storageKey, token);
      }
      const response = await fetch('/api/witness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logId: container.dataset['witnessLog'],
          revision: Number(container.dataset['witnessRevision']),
          visitorId: fingerprint.visitorId,
          generation: 'fpjs-5.3.0',
          requestToken: token,
          consent: true,
          ...(document.referrer
            ? { referrer: new URL(document.referrer).origin }
            : {}),
        }),
      });
      if (!response.ok) throw new Error('Unavailable');
      const result = z
        .object({ accepted: z.boolean(), eventId: z.uuid().optional() })
        .parse(await response.json());
      status.textContent = result.accepted
        ? 'Measurement recorded. Thank you.'
        : 'This browser was already counted.';
      if (result.eventId) {
        try {
          localStorage.setItem(
            `witness-receipt:${logId}`,
            JSON.stringify({ eventId: result.eventId, token }),
          );
        } catch {
          /* Receipt remains available in this page. */
        }
        showReceipt(result.eventId, token);
      }
    } catch {
      status.textContent = 'Measurement unavailable. You can try again.';
      button.disabled = false;
    }
  }
}

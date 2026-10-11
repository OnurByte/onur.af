import type { APIRoute } from 'astro';
import { donationGateway } from '../../client/gateway';
import { formatXmrAmount, parseXmrAmount } from '../../donations/money';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AMOUNTS = new Set(['0.01', '0.05', '0.1', '0.25']);
const MAX_BODY = 2048;

async function readBoundedBody(request: Request): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) {
        await reader.cancel();
        throw new Error('form too large');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder('utf-8', { fatal: true }).decode(body);
}

function retryUrl(id: string, choice: string, custom: string, error = 'unavailable'): string {
  const query = new URLSearchParams({ retry: id, choice, error });
  if (choice === 'custom' && custom) query.set('custom', custom);
  return `/donate?${query}`;
}

export const POST: APIRoute = async ({ request, redirect }) => {
  let retryId = '';
  let retryChoice = '';
  let retryAmount = '';
  try {
    const origin = request.headers.get('origin');
    if (!origin || new URL(origin).origin !== new URL(request.url).origin) return new Response('Request rejected.', { status: 403 });
    const type = request.headers.get('content-type') ?? '';
    const rawLength = request.headers.get('content-length');
    if (!/^application\/x-www-form-urlencoded(?:\s*;|$)/i.test(type)) return new Response('Invalid request.', { status: 400 });
    if (rawLength && /^\d+$/.test(rawLength) && Number(rawLength) > MAX_BODY) return new Response('Request too large.', { status: 413 });
    let data: URLSearchParams;
    try { data = new URLSearchParams(await readBoundedBody(request)); }
    catch { return new Response('Invalid request.', { status: 400 }); }
    const ids = data.getAll('id');
    const choice = data.getAll('amount');
    const custom = data.getAll('customAmount');
    if (ids.length !== 1 || !UUID.test(ids[0])) return new Response('Choose a valid amount.', { status: 400 });
    const id = ids[0].toLowerCase();
    retryId = id;
    if (choice.length !== 1 || custom.length > 1) return redirect(retryUrl(retryId, '', '', 'amount'), 303);
    retryChoice = choice[0];
    let amount: string;
    try {
      if (AMOUNTS.has(retryChoice)) amount = retryChoice;
      else if (retryChoice === 'custom' && custom.length === 1) amount = formatXmrAmount(parseXmrAmount(custom[0]));
      else return redirect(retryUrl(retryId, 'custom', '', 'amount'), 303);
    } catch { return redirect(retryUrl(retryId, 'custom', '', 'amount'), 303); }
    retryAmount = retryChoice === 'custom' ? amount : '';

    const { url: base, token } = donationGateway();
    const endpoint = new URL('/donations', base);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ id, amount }),
      signal: AbortSignal.timeout(5000),
      redirect: 'error',
    });
    if (!response.ok) throw new Error('gateway unavailable');
    const created: unknown = await response.json();
    if (!created || typeof created !== 'object') throw new Error('gateway unavailable');
    const result = created as Record<string, unknown>;
    const network = import.meta.env.XMR_NETWORK ?? process.env.XMR_NETWORK ?? 'stagenet';
    const prefix = network === 'mainnet' ? '8' : network === 'stagenet' ? '7' : network === 'testnet' ? 'B' : '';
    if (result.unavailable === true || result.id !== id || result.amount !== amount || typeof result.address !== 'string' || !new RegExp(`^${prefix}[1-9A-HJ-NP-Za-km-z]{94}$`).test(result.address)) {
      throw new Error('gateway unavailable');
    }
    return redirect(`/donate/${id}`, 303);
  } catch {
    if (retryId && retryChoice) return redirect(retryUrl(retryId, retryChoice, retryAmount), 303);
    return new Response('Donation service is temporarily unavailable. Please try again.', { status: 503 });
  }
};

import { moneroAddress, paymentStatuses, type PaymentStatus } from './protocol';
import { formatXmrAmount, parseXmrAmount, parseXmrAmountOrZero } from './money';

interface AgentOrder {
  id: string;
  address: string;
  amount: string;
  status: PaymentStatus;
  birthdayHeight?: number | undefined;
}

interface AgentStatus {
  id: string;
  paid: boolean;
  status: PaymentStatus;
  amount: string;
  receivedXmr: number;
  pendingXmr?: number | undefined;
  lockedXmr?: number | undefined;
  shortfallXmr?: string | undefined;
  overpaid?: boolean | undefined;
  overpaidXmr?: string | undefined;
  confirmations: number;
  minConfirmations?: number | undefined;
  syncing?: boolean | undefined;
  txids?: string[] | undefined;
}

export interface DonationAgentClient {
  create(id: string, amount: string): Promise<AgentOrder>;
  recover(id: string, amount: string): Promise<AgentOrder>;
  status(id: string): Promise<AgentStatus>;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('invalid agent response');
  return value as Record<string, unknown>;
}

function finiteNumber(
  value: unknown,
  field: string,
  { optional = false, integer = false } = {},
): number | undefined {
  if (value === undefined && optional) return undefined;
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    (integer && !Number.isInteger(value))
  ) {
    throw new Error(`invalid agent response: ${field}`);
  }
  return value;
}

function paymentStatus(value: unknown): PaymentStatus {
  if (typeof value !== 'string' || !paymentStatuses.has(value)) {
    throw new Error('invalid agent response: status');
  }
  return value as PaymentStatus;
}

function validateId(value: unknown, expected: string): string {
  if (value !== expected)
    throw new Error(
      'agent response id mismatch; refusing to use another donation address',
    );
  return expected;
}

function agentOrder(
  value: unknown,
  id: string,
  expectedAmount: string,
): AgentOrder {
  const raw = record(value);
  const resultId = validateId(raw['id'], id);
  if (typeof raw['address'] !== 'string' || !moneroAddress.test(raw['address']))
    throw new Error('invalid agent response: address');
  if (
    typeof raw['amount'] !== 'string' ||
    formatXmrAmount(parseXmrAmount(raw['amount'])) !== expectedAmount
  ) {
    throw new Error(
      'agent response amount mismatch; refusing to use this donation address',
    );
  }
  return {
    id: resultId,
    address: raw['address'],
    amount: expectedAmount,
    status: paymentStatus(raw['status']),
    birthdayHeight: finiteNumber(raw['birthdayHeight'], 'birthdayHeight', {
      optional: true,
      integer: true,
    }),
  };
}

function localHttpUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('agent URL must be a loopback HTTP URL');
  }
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost', '[::1]', '::1'].includes(url.hostname) ||
    url.username ||
    url.password
  ) {
    throw new Error('agent URL must be a loopback HTTP URL');
  }
  return url;
}

export function createDonationAgentClient({
  baseUrl,
  token,
  timeoutMs = 3000,
}: {
  baseUrl: string;
  token: string;
  timeoutMs?: number | undefined;
}): DonationAgentClient {
  const base = localHttpUrl(baseUrl);
  if (!token || /[\r\n]/.test(token))
    throw new Error('agent token is required');
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0)
    throw new Error('timeout must be a positive integer');

  async function request(
    path: string,
    init: RequestInit = {},
  ): Promise<unknown> {
    const headers = new Headers(init.headers);
    headers.set('authorization', `Bearer ${token}`);
    if (init.body && !headers.has('content-type'))
      headers.set('content-type', 'application/json');
    const response = await fetch(new URL(path, base), {
      ...init,
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
      headers,
    });
    if (!response.ok)
      throw new Error(`payment agent returned HTTP ${response.status}`);
    try {
      return await response.json();
    } catch {
      throw new Error('payment agent returned invalid JSON');
    }
  }

  return {
    async create(id, amount) {
      if (!id || id.length > 2048) throw new Error('donation id is required');
      const expectedAmount = formatXmrAmount(parseXmrAmount(amount));
      return agentOrder(
        await request('/order', {
          method: 'POST',
          body: JSON.stringify({ id, amount: expectedAmount }),
        }),
        id,
        expectedAmount,
      );
    },
    async recover(id, amount) {
      if (!id || id.length > 2048) throw new Error('donation id is required');
      const expectedAmount = formatXmrAmount(parseXmrAmount(amount));
      return agentOrder(
        await request(`/order/${encodeURIComponent(id)}`),
        id,
        expectedAmount,
      );
    },
    async status(id) {
      const raw = record(await request(`/order/${encodeURIComponent(id)}`));
      const resultId = validateId(raw['id'], id);
      if (typeof raw['paid'] !== 'boolean')
        throw new Error('invalid agent response: paid');
      const status = paymentStatus(raw['status']);
      if (raw['paid'] !== (status === 'paid'))
        throw new Error('invalid agent response: paid/status mismatch');
      if (typeof raw['amount'] !== 'string')
        throw new Error('invalid agent response: amount');
      parseXmrAmount(raw['amount']);
      if (raw['syncing'] !== undefined && typeof raw['syncing'] !== 'boolean')
        throw new Error('invalid agent response: syncing');
      if (raw['overpaid'] !== undefined && typeof raw['overpaid'] !== 'boolean')
        throw new Error('invalid agent response: overpaid');
      if (
        raw['txids'] !== undefined &&
        (!Array.isArray(raw['txids']) ||
          raw['txids'].some((txid) => typeof txid !== 'string'))
      ) {
        throw new Error('invalid agent response: txids');
      }
      for (const field of ['shortfallXmr', 'overpaidXmr'] as const) {
        if (raw[field] !== undefined) {
          if (typeof raw[field] !== 'string')
            throw new Error(`invalid agent response: ${field}`);
          parseXmrAmountOrZero(raw[field] as string);
        }
      }
      return {
        id: resultId,
        paid: raw['paid'],
        status,
        amount: raw['amount'],
        receivedXmr: finiteNumber(raw['receivedXmr'], 'receivedXmr')!,
        pendingXmr: finiteNumber(raw['pendingXmr'], 'pendingXmr', {
          optional: true,
        }),
        lockedXmr: finiteNumber(raw['lockedXmr'], 'lockedXmr', {
          optional: true,
        }),
        shortfallXmr: raw['shortfallXmr'] as string | undefined,
        overpaid: raw['overpaid'] as boolean | undefined,
        overpaidXmr: raw['overpaidXmr'] as string | undefined,
        confirmations: finiteNumber(raw['confirmations'], 'confirmations', {
          integer: true,
        })!,
        minConfirmations: finiteNumber(
          raw['minConfirmations'],
          'minConfirmations',
          { optional: true, integer: true },
        ),
        syncing: raw['syncing'] as boolean | undefined,
        txids: raw['txids'] as string[] | undefined,
      };
    },
  };
}

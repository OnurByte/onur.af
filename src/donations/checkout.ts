import { formatXmrAmount, parseXmrAmount, parseXmrAmountOrZero } from './money';
import { isRecord } from '../portfolio/is-record';
import { donationSubaddressPrefix, paymentStatuses } from './protocol';

const count = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;

/** Validate gateway data before exposing amounts and payment progress to a page. */
export function parseCheckoutDonation(
  value: unknown,
  id: string,
  network: string,
) {
  if (!isRecord(value)) throw new Error('unavailable');
  const row = value;
  const subaddressPrefix = donationSubaddressPrefix(network);
  const address = row['address'];
  const amount = row['amount'];
  if (
    row['id'] !== id ||
    typeof amount !== 'string' ||
    typeof address !== 'string' ||
    !new RegExp(`^${subaddressPrefix}[1-9A-HJ-NP-Za-km-z]{94}$`).test(address)
  )
    throw new Error('unavailable');
  parseXmrAmount(amount);
  const status = isRecord(row['status']) ? row['status'] : undefined;
  const paymentStatus =
    typeof status?.['status'] === 'string'
      ? status['status']
      : typeof row['status'] === 'string'
        ? row['status']
        : undefined;
  const knownStatus =
    paymentStatus && paymentStatuses.has(paymentStatus)
      ? paymentStatus
      : undefined;
  const confirmations = count(status?.['confirmations']);
  const minConfirmations = count(status?.['minConfirmations']);
  let received: string | undefined;
  if (
    typeof status?.['receivedXmr'] === 'number' &&
    Number.isFinite(status['receivedXmr']) &&
    status['receivedXmr'] >= 0
  ) {
    try {
      received = formatXmrAmount(
        parseXmrAmountOrZero(status['receivedXmr'].toFixed(12)),
      );
    } catch {
      /* A malformed optional amount is simply not shown. */
    }
  }
  let shortfall: string | undefined;
  if (typeof status?.['shortfallXmr'] === 'string') {
    try {
      shortfall = formatXmrAmount(parseXmrAmountOrZero(status['shortfallXmr']));
    } catch {
      /* A malformed optional amount is simply not shown. */
    }
  }
  return {
    id,
    amount,
    address,
    status: knownStatus,
    syncing: status?.['syncing'] === true,
    confirmations,
    minConfirmations,
    received,
    shortfall,
    unavailable: row['unavailable'] === true || knownStatus === undefined,
  };
}

type CheckoutDonation = ReturnType<typeof parseCheckoutDonation>;
export type CheckoutState =
  'unavailable' | 'syncing' | 'paid' | 'partial' | 'confirming' | 'waiting';

const stateByStatus: Record<string, CheckoutState> = {
  paid: 'paid',
  partial: 'partial',
  underpaid: 'partial',
  unconfirmed: 'confirming',
  locked: 'confirming',
  mempool: 'confirming',
  pending: 'waiting',
};

/** Collapse gateway status into the one state the contribution page presents. */
export function checkoutState(
  donation: CheckoutDonation | undefined,
  unavailable: boolean,
): CheckoutState {
  if (unavailable || !donation || donation.unavailable) return 'unavailable';
  if (donation.syncing) return 'syncing';
  return (
    (donation.status ? stateByStatus[donation.status] : undefined) ?? 'syncing'
  );
}

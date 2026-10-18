import { formatXmrAmount, parseXmrAmount, parseXmrAmountOrZero } from './money';
import { donationSubaddressPrefix, paymentStatuses } from './protocol';

/** Validate gateway data before exposing amounts and payment progress to a page. */
export function parseCheckoutDonation(
  value: unknown,
  id: string,
  network: string,
) {
  if (!value || typeof value !== 'object') throw new Error('unavailable');
  const row = value as Record<string, unknown>;
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
  const status =
    row['status'] && typeof row['status'] === 'object'
      ? (row['status'] as Record<string, unknown>)
      : undefined;
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
  const confirmations =
    typeof status?.['confirmations'] === 'number' &&
    Number.isSafeInteger(status['confirmations'])
      ? status['confirmations']
      : undefined;
  const minConfirmations =
    typeof status?.['minConfirmations'] === 'number' &&
    Number.isSafeInteger(status['minConfirmations'])
      ? status['minConfirmations']
      : undefined;
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
    } catch {}
  }
  let shortfall: string | undefined;
  if (typeof status?.['shortfallXmr'] === 'string') {
    try {
      shortfall = formatXmrAmount(parseXmrAmountOrZero(status['shortfallXmr']));
    } catch {}
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

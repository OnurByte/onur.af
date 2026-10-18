export const moneroAddress = /^[45789AB][1-9A-HJ-NP-Za-km-z]{94}$/;

const statuses = [
  'pending',
  'mempool',
  'unconfirmed',
  'partial',
  'underpaid',
  'locked',
  'paid',
] as const;

export type PaymentStatus = (typeof statuses)[number];
export const paymentStatuses: ReadonlySet<string> = new Set(statuses);

export function donationSubaddressPrefix(network: string): string {
  switch (network) {
    case 'mainnet':
      return '8';
    case 'stagenet':
      return '7';
    case 'testnet':
      return 'B';
    default:
      throw new Error('XMR_NETWORK must be mainnet, stagenet or testnet');
  }
}

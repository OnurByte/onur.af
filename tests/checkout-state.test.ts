import { expect, test } from 'bun:test';
import { checkoutState } from '../src/donations/checkout';

const donation = (
  status: string | undefined,
  extra: { syncing?: boolean; unavailable?: boolean } = {},
) =>
  ({
    id: 'id',
    amount: '0.05',
    address: 'address',
    status,
    syncing: extra.syncing ?? false,
    confirmations: undefined,
    minConfirmations: undefined,
    received: undefined,
    shortfall: undefined,
    unavailable: extra.unavailable ?? false,
  }) as Parameters<typeof checkoutState>[0];

test('checkout state maps every gateway status to one page state', () => {
  const cases: [string | undefined, ReturnType<typeof checkoutState>][] = [
    ['paid', 'paid'],
    ['partial', 'partial'],
    ['underpaid', 'partial'],
    ['unconfirmed', 'confirming'],
    ['locked', 'confirming'],
    ['mempool', 'confirming'],
    ['pending', 'waiting'],
    ['expired', 'syncing'],
    [undefined, 'syncing'],
  ];
  for (const [status, expected] of cases)
    expect(checkoutState(donation(status), false)).toBe(expected);
});

test('unavailable and syncing take precedence over the payment status', () => {
  expect(checkoutState(undefined, true)).toBe('unavailable');
  expect(checkoutState(donation('paid'), true)).toBe('unavailable');
  expect(checkoutState(donation('paid', { unavailable: true }), false)).toBe(
    'unavailable',
  );
  expect(checkoutState(donation('paid', { syncing: true }), false)).toBe(
    'syncing',
  );
});

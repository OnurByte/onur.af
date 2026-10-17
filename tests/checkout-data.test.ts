import { expect, test } from 'bun:test';
import { parseCheckoutDonation } from '../src/donations/checkout';

const id = '5f14af55-aacc-4660-8658-58dc000247e5';
const row = {
  id,
  address: '7' + '1'.repeat(94),
  amount: '0.05',
  status: {
    status: 'partial',
    receivedXmr: 0.025,
    shortfallXmr: '0.025',
    confirmations: 3,
    minConfirmations: 10,
  },
};

test('checkout data normalizes amounts and progress independently of the page', () => {
  expect(parseCheckoutDonation(row, id, 'stagenet')).toMatchObject({
    id,
    status: 'partial',
    received: '0.025',
    shortfall: '0.025',
    confirmations: 3,
    minConfirmations: 10,
    unavailable: false,
  });
  expect(
    parseCheckoutDonation({ ...row, status: 'pending' }, id, 'stagenet').status,
  ).toBe('pending');
});

test('checkout keeps syncing separate from the payment status', () => {
  expect(
    parseCheckoutDonation(
      { ...row, status: { status: 'pending', syncing: true } },
      id,
      'stagenet',
    ),
  ).toMatchObject({ status: 'pending', syncing: true });
});

test('checkout data rejects mismatched identity and address network', () => {
  for (const invalid of [
    null,
    [],
    { ...row, id: 'other' },
    { ...row, address: '8' + '1'.repeat(94) },
    { ...row, amount: '-1' },
  ]) {
    expect(() => parseCheckoutDonation(invalid, id, 'stagenet')).toThrow();
  }
  expect(() => parseCheckoutDonation(row, id, 'unknown')).toThrow();
});

test('unknown status keeps the validated address but disables payment instructions', () => {
  expect(
    parseCheckoutDonation({ ...row, status: 'invented' }, id, 'stagenet'),
  ).toMatchObject({
    address: row.address,
    status: undefined,
    unavailable: true,
  });
});

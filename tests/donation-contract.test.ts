import { expect, test } from 'bun:test';
import {
  donationRequestSchema,
  readyDonationSchema,
} from '../src/donations/contracts';

const id = 'c6a9c64e-f8de-4331-8d18-006cf57af7ad';
const address = `8${'1'.repeat(94)}`;
test('request contract rejects untrusted JSON shapes and invalid amounts', () => {
  for (const input of [
    null,
    [],
    1,
    'text',
    {},
    { id, amount: 1 },
    { id, amount: '0' },
    { id, amount: '101' },
    { id, amount: '1e-2' },
  ])
    expect(donationRequestSchema.safeParse(input).success).toBe(false);
  expect(donationRequestSchema.parse({ id, amount: '0.01' })).toEqual({
    id,
    amount: '0.01',
  });
});
test('ready contract binds exact order, amount, network and availability', () => {
  const schema = readyDonationSchema({
    id,
    amount: '0.01',
    network: 'mainnet',
  });
  expect(
    schema.parse({ id, amount: '0.01', address, state: 'ready' }),
  ).toMatchObject({ state: 'ready' });
  for (const input of [
    null,
    [],
    { id, amount: '0.01', address, unavailable: true },
    { id, amount: '0.1', address },
    { id: crypto.randomUUID(), amount: '0.01', address },
    { id, amount: '0.01', address: `7${'1'.repeat(94)}` },
  ])
    expect(schema.safeParse(input).success).toBe(false);
});

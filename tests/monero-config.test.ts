import { expect, test } from 'bun:test';
import { moneroConfiguration } from '../src/donations/config';

test('Monero configuration has empty public identity until configured', () => {
  expect(moneroConfiguration({})).toEqual({
    network: 'stagenet',
    primaryAddress: '',
    openAlias: '',
  });
});

test('Monero identity uses one configuration without exposing credentials', () => {
  expect(
    moneroConfiguration({
      XMR_NETWORK: 'mainnet',
      XMR_PRIMARY_ADDRESS: ' wallet-address ',
      XMR_OPENALIAS: ' donate.example.org ',
      XMR_VIEW_KEY: 'private',
    }),
  ).toEqual({
    network: 'mainnet',
    primaryAddress: 'wallet-address',
    openAlias: 'donate.example.org',
  });
});

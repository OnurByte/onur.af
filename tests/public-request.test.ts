import { expect, test } from 'bun:test';
import {
  publicAddress,
  validatePublicUrl,
  resolvePublicHost,
} from '../src/portfolio/public-request';

test('only global unicast addresses can be used for outbound requests', () => {
  for (const address of [
    '127.0.0.1',
    '10.1.1.1',
    '169.254.169.254',
    '192.168.1.1',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '::1',
    '::ffff:127.0.0.1',
    'fc00::1',
    'fe80::1',
    '2001:db8::1',
    'bad',
  ])
    expect(publicAddress(address)).toBe(false);
  expect(publicAddress('8.8.8.8')).toBe(true);
  expect(publicAddress('2606:4700:4700::1111')).toBe(true);
});

test('outbound URL validation rejects credentials, private literals and alternate ports', () => {
  for (const url of [
    'file:///etc/passwd',
    'http://example.com/',
    'https://user@example.com/',
    'https://127.1/',
    'https://[::1]/',
    'https://example.com:444/',
  ])
    expect(() => validatePublicUrl(url)).toThrow();
});

test('DNS responses containing private addresses are rejected before connection', async () => {
  await expect(
    resolvePublicHost('example.com', async () => [
      { address: '8.8.8.8', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]),
  ).rejects.toThrow('public');
  expect(
    await resolvePublicHost('example.com', async () => [
      { address: '8.8.8.8', family: 4 },
    ]),
  ).toEqual({ address: '8.8.8.8', family: 4 });
});

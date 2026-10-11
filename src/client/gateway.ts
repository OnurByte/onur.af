import { isIP } from 'node:net';

export function donationGateway() {
  const rawUrl = import.meta.env.DONATION_GATEWAY_URL ?? process.env.DONATION_GATEWAY_URL ?? 'http://127.0.0.1:8790';
  const token = import.meta.env.DONATION_GATEWAY_TOKEN ?? process.env.DONATION_GATEWAY_TOKEN;
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new Error('payment service unavailable'); }
  const loopback = url.hostname === 'localhost' || url.hostname === '[::1]' || url.hostname === '::1'
    || (isIP(url.hostname) === 4 && url.hostname.startsWith('127.'));
  if (url.protocol !== 'http:' || !loopback || url.username || url.password || !token || /[\r\n]/.test(token)) {
    throw new Error('payment service unavailable');
  }
  return { url, token };
}

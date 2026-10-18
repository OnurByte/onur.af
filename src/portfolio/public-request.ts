import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';

export function publicAddress(address: string): boolean {
  try {
    return ipaddr.process(address).range() === 'unicast';
  } catch {
    return false;
  }
}

export function validatePublicUrl(href: string): URL {
  const url = new URL(href);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    (!hostname.includes('.') && !isIP(hostname)) ||
    (isIP(hostname) && !publicAddress(hostname))
  )
    throw new Error('Expected public HTTPS URL on port 443');
  return url;
}

type Address = { address: string; family: number };
export async function resolvePublicHost(
  hostname: string,
  resolve: (hostname: string) => Promise<Address[]> = (name) =>
    lookup(name, { all: true }),
): Promise<Address> {
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await resolve(hostname);
  if (
    !addresses.length ||
    addresses.some((item) => !publicAddress(item.address))
  )
    throw new Error('DNS must contain only public addresses');
  return addresses[0]!;
}

/** Pin the checked DNS answer to the socket; validate each redirect separately. */
export async function publicRequest(
  href: string,
  options: {
    method?: 'GET' | 'POST';
    body?: string;
    headers?: Record<string, string>;
  } = {},
  redirects = 0,
): Promise<Response> {
  const url = validatePublicUrl(href);
  const address = await Promise.race([
    resolvePublicHost(url.hostname.replace(/^\[|\]$/g, '')),
    new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error('DNS timed out')), 5000);
      timer.unref();
    }),
  ]);
  const response = await new Promise<Response>((resolve, reject) => {
    const req = request(
      url,
      {
        method: options.method ?? 'GET',
        agent: false,
        ...{ autoSelectFamily: false },
        signal: AbortSignal.timeout(10000),
        lookup: (_hostname, _options, callback) =>
          callback(null, address.address, address.family),
        headers: {
          'User-Agent': 'onurbyte-portfolio/1.0',
          Accept: 'text/html,application/json;q=0.9,*/*;q=0.5',
          'Accept-Encoding': 'identity',
          ...options.headers,
        },
      },
      (incoming) => {
        const chunks: Buffer[] = [];
        let size = 0;
        incoming.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > 2_000_000)
            req.destroy(new Error('Response exceeds size limit'));
          else chunks.push(chunk);
        });
        incoming.on('error', reject);
        incoming.on('end', () => {
          const headers = new Headers();
          for (const [key, value] of Object.entries(incoming.headers))
            if (value !== undefined)
              headers.set(key, Array.isArray(value) ? value.join(', ') : value);
          const status = incoming.statusCode ?? 502;
          resolve(
            new Response(
              [204, 205, 304].includes(status) ? null : Buffer.concat(chunks),
              { status, headers },
            ),
          );
        });
      },
    );
    req.on('error', reject);
    req.end(options.body);
  });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (redirects >= 4) throw new Error('Too many redirects');
    if (options.method === 'POST')
      throw new Error('Delivery endpoint redirects are not followed');
    const location = response.headers.get('location');
    if (!location) throw new Error('Missing redirect target');
    return publicRequest(new URL(location, url).href, options, redirects + 1);
  }
  Object.defineProperty(response, 'url', { value: url.href });
  return response;
}

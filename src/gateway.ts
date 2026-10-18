import { donationSubaddressPrefix } from './donations/protocol';
import { requiredEnv as required } from './server/env';
import { jsonNoStore as json } from './server/http';
import { timingSafeEqual } from 'node:crypto';
import { createDonationAgentClient } from './donations/agent';
import { formatXmrAmount, parseXmrAmount } from './donations/money';
import { createDonationStore, DonationCapacityError } from './donations/store';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function startGateway() {
  const token = required('DONATION_GATEWAY_TOKEN');
  if (token.length < 32)
    throw new Error('DONATION_GATEWAY_TOKEN must have at least 32 characters');
  const store = createDonationStore(required('DONATION_DATABASE_URL'));
  const agent = createDonationAgentClient({
    baseUrl: process.env['XMR_AGENT_URL'] || 'http://127.0.0.1:8788',
    token: required('XMR_AGENT_TOKEN'),
    timeoutMs: 15000,
  });
  const network = process.env['XMR_NETWORK'] || 'stagenet';
  const prefix = donationSubaddressPrefix(network);
  await store.initialize();
  let allocating = false;
  return Bun.serve({
    hostname: '127.0.0.1',
    port: Number(process.env['DONATION_GATEWAY_PORT'] || 8790),
    maxRequestBodySize: 4096,
    async fetch(request) {
      const expected = Buffer.from(`Bearer ${token}`);
      const actual = Buffer.from(request.headers.get('authorization') || '');
      if (
        actual.length !== expected.length ||
        !timingSafeEqual(actual, expected)
      ) {
        return json({ error: 'unauthorized' }, 401);
      }
      const path = new URL(request.url).pathname;
      try {
        if (request.method === 'POST' && path === '/donations') {
          if (
            !request.headers.get('content-type')?.startsWith('application/json')
          ) {
            return json({ error: 'JSON required' }, 415);
          }
          let body: { id?: unknown; amount?: unknown };
          try {
            body = await request.json();
          } catch {
            return json({ error: 'invalid request' }, 400);
          }
          if (
            !body ||
            typeof body.id !== 'string' ||
            !UUID.test(body.id) ||
            typeof body.amount !== 'string'
          ) {
            return json({ error: 'invalid donation' }, 400);
          }
          const id = body.id.toLowerCase();
          let amount: string;
          try {
            amount = formatXmrAmount(parseXmrAmount(body.amount));
          } catch {
            return json({ error: 'invalid amount' }, 400);
          }
          if (allocating)
            return json(
              { error: 'creation busy; retry the same donation' },
              503,
            );
          allocating = true;
          try {
            const { donation, created } = await store.reserve(id, amount);
            if (!created) {
              if (donation.state === 'ready') return json(donation);
              try {
                const recovered = await agent.recover(id, amount);
                if (!recovered.address.startsWith(prefix))
                  throw new Error('agent network mismatch');
                return json(await store.attach(id, recovered.address));
              } catch {
                return json(
                  { error: 'donation requires recovery', id: donation.id },
                  409,
                );
              }
            }
            // shortcut: stock agents omit recovery addresses; use the bundled idempotent host for automatic recovery.
            const order = await agent.create(id, amount);
            if (!order.address.startsWith(prefix))
              throw new Error('agent network mismatch');
            await store.attach(id, order.address);
            return json(await store.get(id), 201);
          } finally {
            allocating = false;
          }
        }
        const match = path.match(/^\/donations\/([^/]+)$/);
        if (request.method === 'GET' && match?.[1] && UUID.test(match[1])) {
          const donation = await store.get(match[1].toLowerCase());
          if (!donation) return json({ error: 'not found' }, 404);
          if (donation.state !== 'ready')
            return json({ ...donation, unavailable: true });
          try {
            const status = await agent.status(donation.id);
            if (
              formatXmrAmount(parseXmrAmount(status.amount)) !== donation.amount
            )
              throw new Error('amount mismatch');
            return json({ ...donation, status });
          } catch {
            return json({ ...donation, unavailable: true });
          }
        }
        return json({ error: 'not found' }, 404);
      } catch (error) {
        if (error instanceof DonationCapacityError)
          return json(
            { error: 'donation creation capacity reached; retry later' },
            429,
          );
        return json(
          { error: 'payment service unavailable; retain the same donation id' },
          503,
        );
      }
    },
  });
}

if (import.meta.main) {
  await startGateway();
  console.log('Donation gateway listening on loopback');
}

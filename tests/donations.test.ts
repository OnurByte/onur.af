import { afterEach, describe, expect, test } from 'bun:test';
import { createDonationAgentClient } from '../src/donations/agent';
import { formatXmrAmount, parseXmrAmount } from '../src/donations/money';

const servers: ReturnType<typeof Bun.serve>[] = [];
const address = '8' + '1'.repeat(94);

function agent(handler: (request: Request) => Response | Promise<Response>) {
  const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: handler });
  servers.push(server);
  return createDonationAgentClient({ baseUrl: server.url.toString(), token: 'test-only-token' });
}

afterEach(() => { for (const server of servers.splice(0)) server.stop(true); });

describe('donation money', () => {
  test('converts strict decimal XMR without floating point', () => {
    expect(parseXmrAmount('0.000000000001')).toBe(1n);
    expect(formatXmrAmount(parseXmrAmount('01.230000000000'))).toBe('1.23');
    for (const invalid of ['0', '100.000000000001', '-1', '1e-3', '1.0000000000001', ' 1']) {
      expect(() => parseXmrAmount(invalid)).toThrow();
    }
  });
});

describe('donation agent client', () => {
  test('authenticates, creates one address, then reads status and receipt', async () => {
    const client = agent(async request => {
      expect(request.headers.get('authorization')).toBe('Bearer test-only-token');
      const url = new URL(request.url);
      if (url.pathname === '/order' && request.method === 'POST') {
        expect(await request.json()).toEqual({ id: 'd-1', amount: '0.05' });
        return Response.json({ id: 'd-1', address, amount: '0.05', status: 'pending', birthdayHeight: 42 });
      }
      if (url.pathname === '/order/d-1') return Response.json({ id: 'd-1', paid: false, status: 'partial', amount: '0.05', receivedXmr: 0.02, shortfallXmr: '0', overpaid: false, overpaidXmr: '0', confirmations: 1 });
      if (url.pathname === '/receipt/d-1') return Response.json({ payload: {}, signature: 'sig' });
      return new Response(null, { status: 404 });
    });

    expect(await client.create('d-1', '0.0500')).toEqual({ id: 'd-1', address, amount: '0.05', status: 'pending', birthdayHeight: 42 });
    expect((await client.status('d-1')).status).toBe('partial');
    expect(await client.receipt('d-1')).toEqual({ payload: {}, signature: 'sig' });
  });

  test('rejects bad response ids and never retries ambiguous or duplicate creation', async () => {
    let creates = 0;
    const client = agent(request => {
      if (request.method === 'POST') {
        creates++;
        return Response.json({ id: 'some-other-donation', address, amount: '0.1', status: 'pending' });
      }
      return new Response(null, { status: 404 });
    });
    await expect(client.create('d-2', '0.1')).rejects.toThrow('id mismatch');
    expect(creates).toBe(1);

    const duplicate = agent(() => new Response('duplicate', { status: 409 }));
    await expect(duplicate.create('d-3', '0.1')).rejects.toThrow('HTTP 409');
  });

  test('recovers an existing matching order using read-only GET', async () => {
    let creates = 0;
    const client = agent(request => {
      if (request.method === 'POST') creates++;
      return Response.json({ id: 'd-recover', address, amount: '0.05', status: 'pending', birthdayHeight: 42 });
    });

    await expect(client.recover('d-recover', '0.050')).resolves.toEqual({
      id: 'd-recover', address, amount: '0.05', status: 'pending', birthdayHeight: 42,
    });
    expect(creates).toBe(0);
  });

  test('fails closed when a recovered order omits its address or has a different amount', async () => {
    let creates = 0;
    const missingAddress = agent(request => {
      if (request.method === 'POST') creates++;
      return Response.json({ id: 'd-missing', amount: '0.05', status: 'pending' });
    });
    await expect(missingAddress.recover('d-missing', '0.05')).rejects.toThrow('address');

    const differentAmount = agent(request => {
      if (request.method === 'POST') creates++;
      return Response.json({ id: 'd-other', address, amount: '0.04', status: 'pending' });
    });
    await expect(differentAmount.recover('d-other', '0.05')).rejects.toThrow('amount mismatch');
    expect(creates).toBe(0);
  });

  test('rejects malformed addresses and non-finite status numbers', async () => {
    const badAddress = agent(() => Response.json({ id: 'd-4', address: 'invalid', amount: '0.1', status: 'pending' }));
    await expect(badAddress.create('d-4', '0.1')).rejects.toThrow('address');

    const badStatus = agent(() => new Response('{"id":"d-5","paid":false,"status":"pending","amount":"0.1","receivedXmr":1e999,"confirmations":0}', { headers: { 'content-type': 'application/json' } }));
    await expect(badStatus.status('d-5')).rejects.toThrow('receivedXmr');
  });

  test('rejects negative balances and paid/status disagreement', async () => {
    for (const [field, id] of [['receivedXmr', 'd-6'], ['pendingXmr', 'd-7'], ['lockedXmr', 'd-8']] as const) {
      const client = agent(() => Response.json({ id, paid: false, status: 'partial', amount: '0.1', receivedXmr: 0, confirmations: 0, [field]: -0.1 }));
      await expect(client.status(id)).rejects.toThrow(field);
    }

    const inconsistentPaid = agent(() => Response.json({ id: 'd-9', paid: true, status: 'partial', amount: '0.1', receivedXmr: 0.05, confirmations: 1 }));
    await expect(inconsistentPaid.status('d-9')).rejects.toThrow('paid/status mismatch');
  });
});

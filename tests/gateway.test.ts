import { expect, test } from 'bun:test';
import { startGateway } from '../src/gateway';

test.skipIf(!Bun.env['TEST_DATABASE_URL'])(
  'gateway keeps one address across retries and fails closed on ambiguous allocation',
  async () => {
    const token = crypto.randomUUID();
    const previous = { ...process.env };
    let allocations = 0;
    const saved = new Map<
      string,
      { id: string; amount: string; address: string; status: string }
    >();
    const agent = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      async fetch(request) {
        expect(request.headers.get('authorization')).toBe(`Bearer ${token}`);
        if (request.method === 'GET') {
          const id = new URL(request.url).pathname.split('/').pop()!;
          return saved.has(id)
            ? Response.json(saved.get(id))
            : new Response('sync unavailable', { status: 503 });
        }
        const { id, amount } = (await request.json()) as {
          id: string;
          amount: string;
        };
        allocations++;
        if (amount === '0.02')
          return new Response('unavailable', { status: 503 });
        if (amount === '0.03') {
          saved.set(id, {
            id,
            amount,
            address: '7' + '2'.repeat(94),
            status: 'pending',
          });
          return new Response('response lost after allocation', {
            status: 503,
          });
        }
        return Response.json({
          id,
          amount,
          address: '7' + '1'.repeat(94),
          status: 'pending',
        });
      },
    });
    process.env['DONATION_DATABASE_URL'] = Bun.env['TEST_DATABASE_URL'];
    process.env['DONATION_GATEWAY_TOKEN'] = token;
    process.env['XMR_AGENT_TOKEN'] = token;
    process.env['XMR_AGENT_URL'] = `http://127.0.0.1:${agent.port}`;
    process.env['XMR_NETWORK'] = 'stagenet';
    process.env['DONATION_GATEWAY_PORT'] = '0';
    const gateway = await startGateway();
    const ids = [
      crypto.randomUUID(),
      crypto.randomUUID(),
      crypto.randomUUID(),
    ] as const;
    const sql = new Bun.SQL(Bun.env['TEST_DATABASE_URL']!);
    async function create(id: string, amount: string, authorized = true) {
      return fetch(`http://127.0.0.1:${gateway.port}/donations`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(authorized ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id, amount }),
      });
    }
    try {
      expect((await create(ids[0], '0.01', false)).status).toBe(401);
      const first = await create(ids[0].toUpperCase(), '0.01');
      expect(first.status).toBe(201);
      const firstBody = await first.json();
      expect(firstBody.id).toBe(ids[0]);
      expect((await create(ids[0], '0.010')).status).toBe(200);
      expect(allocations).toBe(1);
      const status = await fetch(
        `http://127.0.0.1:${gateway.port}/donations/${ids[0]}`,
        { headers: { authorization: `Bearer ${token}` } },
      );
      expect((await status.json()).address).toBe(firstBody.address);
      expect((await create(ids[1], '0.02')).status).toBe(503);
      expect((await create(ids[1], '0.02')).status).toBe(409);
      expect(allocations).toBe(2);
      expect((await create(ids[2], '0.03')).status).toBe(503);
      const recovered = await create(ids[2], '0.03');
      expect(recovered.status).toBe(200);
      expect((await recovered.json()).address).toBe(saved.get(ids[2])!.address);
      expect(allocations).toBe(3);
    } finally {
      gateway.stop(true);
      agent.stop(true);
      for (const id of ids)
        await sql`DELETE FROM donations WHERE donation_id=${id}::uuid`;
      await sql.close();
      for (const key of Object.keys(process.env))
        if (!(key in previous)) delete process.env[key];
      Object.assign(process.env, previous);
    }
  },
);

import { expect, test } from 'bun:test';

const enabled = Bun.env.TEST_CHECKOUT === '1';
test.skipIf(!enabled)('built SSR checkout accepts custom amounts and preserves payment URI and status', async () => {
  const id = crypto.randomUUID();
  const token = crypto.randomUUID();
  const address = '75a4WYbeKsdGjdFHqxpgNMSi3oqb1z9yx9m6qvNt3ZbTBpoFnD7EqicUZtCVsQoNPKXF5cMcTLJaTCkYiZVzddby9zc7bFV';
  let creations = 0;
  const gateway = Bun.serve({ hostname:'127.0.0.1', port:0, async fetch(request) {
    expect(request.headers.get('authorization')).toBe(`Bearer ${token}`);
    if (request.method === 'POST') {
      const body = await request.json();
      expect(body).toEqual({id,amount:'0.075'});
      creations++;
      return Response.json({id,amount:'0.075',address,state:'ready'});
    }
    return Response.json({id,amount:'0.075',address,state:'ready',status:{status:'partial',paid:false,syncing:false,confirmations:3,minConfirmations:10,shortfallXmr:'0.025'}});
  }});
  const port = 14322;
  const origin = `http://127.0.0.1:${port}`;
  const server = Bun.spawn(['node','dist/server/entry.mjs'], {env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DONATION_GATEWAY_URL:`http://127.0.0.1:${gateway.port}`,DONATION_GATEWAY_TOKEN:token,XMR_NETWORK:'stagenet',PORTFOLIO_TOR_URL:'http://example.onion',PORTFOLIO_I2P_URL:'javascript:alert(1)',PORTFOLIO_PGP_URL:'/keys/pgp.asc'},stdout:'ignore',stderr:'ignore'});
  try {
    let ready = false;
    for (let attempt=0;attempt<40;attempt++) {
      try { ready = (await fetch(`${origin}/donate`)).ok; } catch {}
      if (ready) break;
      await Bun.sleep(100);
    }
    expect(ready).toBe(true);
    const form = new URLSearchParams({id:id.toUpperCase(),amount:'custom',customAmount:'0.0750'});
    const wrongOrigin = await fetch(`${origin}/donate/create`,{method:'POST',headers:{origin:'http://evil.invalid'},body:form,redirect:'manual'});
    expect(wrongOrigin.status).toBe(403);
    const response = await fetch(`${origin}/donate/create`,{method:'POST',headers:{origin},body:form,redirect:'manual'});
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(`/donate/${id}`);
    const checkout = await fetch(`${origin}/donate/${id}`);
    const html = await checkout.text();
    expect(html).toContain('Partial payment received');
    expect(html).toContain(address);
    expect(html).toContain(`monero:${address}?tx_amount=0.025`);
    expect(html).toContain('Requested donation: 0.075 XMR');
    expect(html).toContain('<svg');
    expect(html).toContain('href="http://example.onion/"');
    expect(html).toContain('href="/keys/pgp.asc"');
    expect(html).not.toContain('javascript:alert(1)');
    expect(html).toContain('href="/donate"');
    expect(html).not.toContain(token);
    expect(creations).toBe(1);
  } finally { server.kill(); await server.exited; gateway.stop(true); }
}, 15000);

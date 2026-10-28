// Browser fixtures are synthetic; this server never contacts a wallet.
export {};
const states = ['waiting', 'partial', 'confirming', 'paid', 'syncing'];
const gateway = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    if (request.headers.get('authorization') !== 'Bearer browser-fixture') {
      return new Response(null, { status: 401 });
    }
    const url = new URL(request.url);
    let id = url.pathname.split('/').at(-1) ?? '';
    let amount = '0.05';
    if (request.method === 'POST' && url.pathname === '/donations') {
      try {
        const body = (await request.json()) as {
          id?: unknown;
          amount?: unknown;
        };
        if (typeof body.id !== 'string' || typeof body.amount !== 'string')
          return new Response(null, { status: 400 });
        id = body.id;
        amount = body.amount;
      } catch {
        return new Response(null, { status: 400 });
      }
    }
    const state = states[Number(id.at(-1))];
    if (!state) return new Response(null, { status: 503 });
    return Response.json({
      id,
      amount,
      address:
        '75a4WYbeKsdGjdFHqxpgNMSi3oqb1z9yx9m6qvNt3ZbTBpoFnD7EqicUZtCVsQoNPKXF5cMcTLJaTCkYiZVzddby9zc7bFV',
      status: {
        status:
          state === 'waiting' || state === 'syncing'
            ? 'pending'
            : state === 'confirming'
              ? 'unconfirmed'
              : state,
        syncing: state === 'syncing',
        shortfallXmr: '0.025',
        receivedXmr: 0.025,
        confirmations: 3,
        minConfirmations: 10,
      },
    });
  },
});
const server = Bun.spawn(['node', 'dist/server/entry.mjs'], {
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: '14323',
    SITE_URL: 'http://127.0.0.1:14323',
    DONATION_GATEWAY_URL: `http://127.0.0.1:${gateway.port}`,
    DONATION_GATEWAY_TOKEN: 'browser-fixture',
    XMR_NETWORK: 'stagenet',
    PORTFOLIO_TOR_URL: '',
    PORTFOLIO_I2P_URL: '',
    ANNOTATIONS_ENABLED: '1',
    ANNOTATIONS_RATE_SECRET: crypto.randomUUID() + crypto.randomUUID(),
  },
  stdout: 'inherit',
  stderr: 'inherit',
});
function stop() {
  server.kill();
  void gateway.stop(true);
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
process.exit(await server.exited);

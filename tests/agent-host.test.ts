import { expect, test } from 'bun:test';
import { createAgentPoller, createOrderHandler, createWriterLockGuard } from '../src/xmr/agent-host';

const ID = '5f14af55-aacc-4660-8658-58dc000247e5';
const ADDRESS = `7${'1'.repeat(94)}`;

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

function request(id = ID, amount = '0.01') {
  return new Request('http://127.0.0.1:8788/order', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, amount }),
  });
}

test('poller shutdown waits until its current scanner tick finishes', async () => {
  const entered = deferred();
  const release = deferred();
  const poller = createAgentPoller({
    assertLock: async () => {},
    async tick() { entered.resolve(); await release.promise; },
    onFailure: () => {},
  });
  poller.start(0);
  await entered.promise;
  let finished = false;
  const stopping = poller.stop().then(() => { finished = true; });
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(finished).toBe(false);
  release.resolve();
  await stopping;
  expect(finished).toBe(true);
});

test('serializes same-id creates and returns the durable address on a lost-response retry', async () => {
  const orders = new Map<string, any>();
  const entered = deferred();
  const release = deferred();
  let creates = 0;
  const agent = {
    get: (id: string) => orders.get(id) ?? null,
    async createOrder({ id, amount }: { id: string; amount: string }) {
      creates++;
      entered.resolve();
      await release.promise;
      const order = { id, address: ADDRESS, amount, status: 'pending', paid: false, receivedXmr: 0, confirmations: 0, index: 1, birthdayHeight: 100 };
      orders.set(id, order);
      return { ...order };
    },
  };
  let walletSaves = 0;
  let ledgerSaves = 0;
  const handle = createOrderHandler({ agent, saveWallet: async () => { walletSaves++; }, persistOrders: async () => { ledgerSaves++; } });

  const firstPromise = handle(request());
  await entered.promise;
  const retryPromise = handle(request(ID, '0.010'));
  const statusPromise = handle(new Request(`http://127.0.0.1:8788/order/${ID}`));
  release.resolve();
  const [first, retry, status] = await Promise.all([firstPromise, retryPromise, statusPromise]);

  expect(first.status).toBe(201);
  expect(retry.status).toBe(200);
  expect((await first.json()).address).toBe(ADDRESS);
  expect((await retry.json()).address).toBe(ADDRESS);
  expect((await status.json()).address).toBe(ADDRESS);
  expect(creates).toBe(1);
  expect(walletSaves).toBe(3);
  expect(ledgerSaves).toBe(3);
});

test('rejects reusing an id for a different amount without allocating another address', async () => {
  const orders = new Map<string, any>();
  let creates = 0;
  const agent = {
    get: (id: string) => orders.get(id) ?? null,
    async createOrder({ id, amount }: { id: string; amount: string }) {
      creates++;
      const order = { id, address: ADDRESS, amount, status: 'pending', paid: false };
      orders.set(id, order);
      return order;
    },
  };
  const handle = createOrderHandler({ agent, saveWallet: async () => {}, persistOrders: async () => {} });

  expect((await handle(request())).status).toBe(201);
  expect((await handle(request(ID, '0.02'))).status).toBe(409);
  expect(creates).toBe(1);
});

test('GET exposes the existing address with the donation status fields', async () => {
  const order = { id: ID, address: ADDRESS, amount: '0.01', status: 'partial', paid: false, receivedXmr: 0.004, pendingXmr: 0, lockedXmr: 0, confirmations: 0, index: 1, birthdayHeight: 100 };
  const handle = createOrderHandler({ agent: { get: id => id === ID ? order : null, createOrder: async () => order }, saveWallet: async () => {}, persistOrders: async () => {} });

  const response = await handle(new Request(`http://127.0.0.1:8788/order/${ID}`));
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body).toMatchObject({ id: ID, address: ADDRESS, paid: false, status: 'partial', amount: '0.01', receivedXmr: 0.004, confirmations: 0, minConfirmations: 10, syncing: true });
});

test('fails closed after wallet or order persistence fails', async () => {
  const orders = new Map<string, any>();
  let creates = 0;
  const agent = {
    get: (id: string) => orders.get(id) ?? null,
    async createOrder({ id, amount }: { id: string; amount: string }) {
      creates++;
      const order = { id, address: ADDRESS, amount, status: 'pending', paid: false };
      orders.set(id, order);
      return order;
    },
  };
  const handle = createOrderHandler({ agent, saveWallet: async () => { throw new Error('wallet save failure'); }, persistOrders: async () => {} });

  expect((await handle(request())).status).toBe(503);
  expect((await handle(request(crypto.randomUUID()))).status).toBe(503);
  expect(creates).toBe(1);

  const secondAgent = {
    get: agent.get,
    async createOrder({ id, amount }: { id: string; amount: string }) {
      const order = { id, address: ADDRESS, amount, status: 'pending', paid: false };
      return order;
    },
  };
  const ledgerFailure = createOrderHandler({ agent: secondAgent, saveWallet: async () => {}, persistOrders: async () => { throw new Error('order ledger failure'); } });
  expect((await ledgerFailure(request())).status).toBe(503);
  expect((await ledgerFailure(request(crypto.randomUUID()))).status).toBe(503);
});

test.skipIf(!Bun.env.TEST_DATABASE_URL)('fails closed permanently when the reserved PostgreSQL lock backend is terminated', async () => {
  const databaseUrl = Bun.env.TEST_DATABASE_URL!;
  const firstSql = new Bun.SQL(databaseUrl);
  const secondSql = new Bun.SQL(databaseUrl);
  const first = await firstSql.reserve();
  const second = await secondSql.reserve();
  const lockId = 874120398123n;
  let expectedPid = 0;
  let lost = 0;
  let ownershipChecks = 0;
  const readOwnership = async () => {
    ownershipChecks++;
    const rows = await first<{ pid: number; held: boolean }[]>`SELECT pg_backend_pid() AS pid,
      EXISTS (
        SELECT 1 FROM pg_locks
        WHERE locktype = 'advisory' AND pid = pg_backend_pid() AND granted AND objsubid = 1
          AND classid = ((${lockId}::bigint >> 32) & 4294967295)::oid
          AND objid = (${lockId}::bigint & 4294967295)::oid
      ) AS held`;
    return { pid: Number(rows[0]?.pid), held: rows[0]?.held === true };
  };
  let guard: ReturnType<typeof createWriterLockGuard> | undefined;
  try {
    const acquired = await first<{ acquired: boolean; pid: number }[]>`SELECT pg_backend_pid() AS pid, pg_try_advisory_lock(${lockId}::bigint) AS acquired`;
    expect(acquired[0].acquired).toBe(true);
    expectedPid = Number(acquired[0].pid);
    guard = createWriterLockGuard({ backendPid: expectedPid, checkOwnership: readOwnership, onLost: () => { lost++; } });
    await guard.assert();
    expect(guard.isHealthy()).toBe(true);

    const terminated = await second<{ terminated: boolean }[]>`SELECT pg_terminate_backend(${expectedPid}::int) AS terminated`;
    expect(terminated[0].terminated).toBe(true);
    await expect(guard.assert()).rejects.toBeDefined();
    expect(guard.isHealthy()).toBe(false);
    expect(lost).toBe(1);
    const checksAfterLoss = ownershipChecks;
    await expect(guard.assert()).rejects.toThrow(/unavailable/);
    expect(ownershipChecks).toBe(checksAfterLoss);
    expect(lost).toBe(1);

    // The terminated backend released its advisory lock. The failed guard never reacquires it.
    const available = await second<{ acquired: boolean }[]>`SELECT pg_try_advisory_lock(${lockId}::bigint) AS acquired`;
    expect(available[0].acquired).toBe(true);
    await second`SELECT pg_advisory_unlock(${lockId}::bigint)`;
  } finally {
    try { await first`SELECT pg_advisory_unlock(${lockId}::bigint)`; } catch { /* first backend may have been terminated */ }
    try { await second`SELECT pg_advisory_unlock(${lockId}::bigint)`; } catch { /* lock was not acquired */ }
    first.release();
    second.release();
    await firstSql.close();
    await secondSql.close();
  }
});

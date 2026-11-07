import { afterAll, beforeEach, expect, test } from 'bun:test';
import { loadOrderLedger, replaceOrderLedger } from '../src/xmr/agent-host';

const url = Bun.env['TEST_DATABASE_URL'];
const sql = url ? new Bun.SQL(url) : undefined;
const ID = '5f14af55-aacc-4660-8658-58dc000247e5';
const OTHER = '6a14af55-aacc-4660-8658-58dc000247e6';
const order = (id: string, index: number, address: string) => ({
  id,
  address,
  index,
  amount: '0.01',
  status: 'pending',
  paid: false,
});
const ADDRESS = `7${'1'.repeat(94)}`;
const ADDRESS_TWO = `7${'3'.repeat(94)}`;

beforeEach(async () => {
  if (sql) await sql`DROP TABLE IF EXISTS xmr_agent_orders`;
});
afterAll(async () => {
  if (!sql) return;
  await sql`DROP TABLE IF EXISTS xmr_agent_orders`;
  await sql.close();
});

test.skipIf(!sql)(
  'the order ledger round-trips through the database',
  async () => {
    if (!sql) return;
    expect((await loadOrderLedger(sql, 'stagenet')).size).toBe(0);
    const orders = new Map([
      [ID, order(ID, 1, ADDRESS)],
      [OTHER, order(OTHER, 2, ADDRESS_TWO)],
    ]);
    await replaceOrderLedger(sql, orders);
    const loaded = await loadOrderLedger(sql, 'stagenet');
    expect([...loaded.keys()].sort()).toEqual([ID, OTHER].sort());
    expect(loaded.get(ID)?.address).toBe(ADDRESS);
    orders.delete(OTHER);
    await replaceOrderLedger(sql, orders);
    expect([...(await loadOrderLedger(sql, 'stagenet')).keys()]).toEqual([ID]);
  },
);

test.skipIf(!sql)(
  'a ledger with a reused subaddress index is rejected',
  async () => {
    if (!sql) return;
    await loadOrderLedger(sql, 'stagenet');
    await replaceOrderLedger(
      sql,
      new Map([
        [ID, order(ID, 1, ADDRESS)],
        [OTHER, order(OTHER, 1, ADDRESS_TWO)],
      ]),
    );
    const outcome = await loadOrderLedger(sql, 'stagenet').then(
      () => 'loaded',
      (error: unknown) => (error instanceof Error ? error.message : 'unknown'),
    );
    expect(outcome).toMatch(/duplicate xmr subaddress index/);
  },
);

test.skipIf(!sql)(
  'orders stored as a jsonb string by earlier versions still load',
  async () => {
    if (!sql) return;
    await loadOrderLedger(sql, 'stagenet');
    const legacy = JSON.stringify(order(ID, 1, ADDRESS));
    await sql`INSERT INTO xmr_agent_orders (order_id, order_data) VALUES (${ID}::uuid, ${legacy}::jsonb)`;
    const loaded = await loadOrderLedger(sql, 'stagenet');
    expect(loaded.get(ID)?.address).toBe(ADDRESS);
    const stored = await sql<
      { type: string }[]
    >`SELECT jsonb_typeof(order_data) AS type FROM xmr_agent_orders`;
    expect(stored[0]?.type).toBe('string');
    await replaceOrderLedger(sql, loaded);
    const rewritten = await sql<
      { type: string }[]
    >`SELECT jsonb_typeof(order_data) AS type FROM xmr_agent_orders`;
    expect(rewritten[0]?.type).toBe('object');
  },
);

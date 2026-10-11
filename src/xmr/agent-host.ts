import { createRequire } from 'node:module';
import { timingSafeEqual } from 'node:crypto';
import { formatXmrAmount, parseXmrAmount } from '../donations/money';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ADDRESS = /^[45789AB][1-9A-HJ-NP-Za-km-z]{94}$/;
const STATUSES = new Set(['pending', 'mempool', 'unconfirmed', 'partial', 'underpaid', 'locked', 'paid']);
const LOCK_ID = 874120398123n;
const validNumber = (value: unknown, integer = false) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && (!integer || Number.isInteger(value));

type XmrOrder = {
  id: string;
  address: string;
  amount: string;
  status: string;
  paid?: boolean;
  receivedXmr?: number;
  pendingXmr?: number;
  lockedXmr?: number;
  shortfallXmr?: string;
  overpaid?: boolean;
  overpaidXmr?: string;
  confirmations?: number;
  minConfirmations?: number;
  txids?: string[];
  birthdayHeight?: number | null;
  index?: number;
  createdAt?: number;
  [key: string]: unknown;
};

export interface PaymentAgent {
  get(id: string): XmrOrder | null;
  createOrder(input: { id: string; amount: string }): Promise<XmrOrder>;
  check(id: string, options?: { sync?: boolean }): Promise<XmrOrder | null>;
  list(): XmrOrder[];
  tick(): Promise<void>;
  stop(): void;
}

export function createAgentPoller({
  tick,
  assertLock,
  isActive = () => false,
  onFailure,
  idlePollMs = 15000,
  activePollMs = 3000,
}: {
  tick: () => Promise<void>;
  assertLock: () => Promise<void>;
  isActive?: () => boolean;
  onFailure: (error: unknown) => void;
  idlePollMs?: number;
  activePollMs?: number;
}) {
  let stopped = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<void> | undefined;
  const schedule = (delay: number) => {
    if (stopped) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = undefined; void run(); }, delay);
    timer.unref?.();
  };
  const run = async () => {
    if (stopped || inFlight) return;
    const current = (async () => { await assertLock(); await tick(); })();
    inFlight = current;
    try { await current; }
    catch (error) { onFailure(error); }
    finally {
      inFlight = undefined;
      if (!stopped) schedule(isActive() ? activePollMs : idlePollMs);
    }
  };
  return {
    start(delay = 0) { if (stopped) { stopped = false; schedule(delay); } },
    kick(delay = 1500) { schedule(delay); },
    async stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = undefined;
      await inFlight?.catch(() => {});
    },
  };
}

export interface OrderHandler {
  (request: Request): Promise<Response>;
  markUnhealthy(): void;
  isHealthy(): boolean;
}

export function createWriterLockGuard({
  backendPid,
  checkOwnership,
  onLost,
}: {
  backendPid: number;
  checkOwnership: () => Promise<{ pid: number; held: boolean }>;
  onLost: () => void;
}) {
  let healthy = true;
  let checks = Promise.resolve();
  return {
    isHealthy: () => healthy,
    assert: (): Promise<void> => {
      if (!healthy) return Promise.reject(new Error('xmr agent database writer lock is unavailable'));
      const check = checks.then(async () => {
        if (!healthy) throw new Error('xmr agent database writer lock is unavailable');
        const owner = await checkOwnership();
        if (owner.pid !== backendPid || owner.held !== true) throw new Error('xmr agent database writer lock was lost');
      }).catch(error => {
        if (healthy) {
          healthy = false;
          onLost();
        }
        throw error;
      });
      checks = check.then(() => undefined, () => undefined);
      return check;
    },
  };
}

export function createOrderHandler({
  agent,
  saveWallet,
  persistOrders,
  onUnhealthy,
  getSyncing,
  refreshOrder,
  minConfirmations = 10,
  network = 'stagenet',
}: {
  agent: Pick<PaymentAgent, 'get' | 'createOrder'>;
  saveWallet: () => Promise<void>;
  persistOrders: () => Promise<void>;
  onUnhealthy?: () => void;
  getSyncing?: () => Promise<boolean>;
  refreshOrder?: (id: string) => Promise<void>;
  minConfirmations?: number;
  network?: 'mainnet' | 'stagenet' | 'testnet';
}): OrderHandler {
  let healthy = true;
  let serial = Promise.resolve();
  const prefixes = { mainnet: '48', stagenet: '57', testnet: '9B' }[network];
  const json = (body: unknown, status = 200) => Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
  const unhealthy = () => {
    if (!healthy) return;
    healthy = false;
    onUnhealthy?.();
  };
  const durable = async () => {
    try {
      await saveWallet();
      await persistOrders();
    } catch {
      unhealthy();
      throw new Error('payment persistence failed');
    }
  };
  const validOrder = (value: unknown, id: string, amount: string): XmrOrder => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid payment order');
    const order = value as XmrOrder;
    if (order.id !== id || typeof order.amount !== 'string' || formatXmrAmount(parseXmrAmount(order.amount)) !== amount ||
      typeof order.address !== 'string' || !ADDRESS.test(order.address) || !prefixes.includes(order.address[0]) ||
      typeof order.status !== 'string' || !STATUSES.has(order.status) || typeof order.paid !== 'boolean' || order.paid !== (order.status === 'paid') ||
      (order.receivedXmr !== undefined && !validNumber(order.receivedXmr)) ||
      (order.pendingXmr !== undefined && !validNumber(order.pendingXmr)) ||
      (order.lockedXmr !== undefined && !validNumber(order.lockedXmr)) ||
      (order.confirmations !== undefined && !validNumber(order.confirmations, true))) throw new Error('invalid payment order');
    return order;
  };
  const responseOrder = (order: XmrOrder) => ({
    id: order.id,
    address: order.address,
    amount: order.amount,
    status: order.status,
    birthdayHeight: order.birthdayHeight ?? undefined,
  });
  const serialize = async <T>(operation: () => Promise<T>): Promise<T> => {
    const next = serial.then(operation, operation);
    serial = next.then(() => undefined, () => undefined);
    return next;
  };

  const handler = (async (request: Request): Promise<Response> => {
    if (!healthy) return json({ error: 'payment agent unavailable' }, 503);
    const path = new URL(request.url).pathname;
    if (request.method === 'POST' && path === '/order') {
      if (!request.headers.get('content-type')?.split(';')[0].trim().toLowerCase().startsWith('application/json')) {
        return json({ error: 'application/json required' }, 415);
      }
      let body: unknown;
      try {
        const text = await request.text();
        if (new TextEncoder().encode(text).byteLength > 4096) return json({ error: 'request too large' }, 413);
        body = JSON.parse(text);
      } catch { return json({ error: 'invalid JSON' }, 400); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'order object required' }, 400);
      const input = body as Record<string, unknown>;
      if (typeof input.id !== 'string' || !UUID.test(input.id) || typeof input.amount !== 'string') return json({ error: 'invalid order' }, 400);
      const id = input.id.toLowerCase();
      let amount: string;
      try { amount = formatXmrAmount(parseXmrAmount(input.amount)); }
      catch { return json({ error: 'invalid amount' }, 400); }

      return serialize(async () => {
        if (!healthy) return json({ error: 'payment agent unavailable' }, 503);
        let existing: XmrOrder | null;
        try { existing = agent.get(id); }
        catch { return json({ error: 'payment agent unavailable' }, 503); }
        if (existing) {
          try {
            if (typeof existing.amount === 'string' && formatXmrAmount(parseXmrAmount(existing.amount)) !== amount) {
              return json({ error: 'order id already belongs to a different amount' }, 409);
            }
            const order = validOrder(existing, id, amount);
            await durable();
            return json(responseOrder(order));
          } catch {
            unhealthy();
            return json({ error: 'payment agent unavailable' }, 503);
          }
        }
        let created: XmrOrder;
        try { created = await agent.createOrder({ id, amount }); }
        catch { return json({ error: 'payment agent unavailable; retry with the same id' }, 503); }
        let order: XmrOrder;
        try { order = validOrder(created, id, amount); }
        catch { unhealthy(); return json({ error: 'payment agent unavailable' }, 503); }
        try { await durable(); }
        catch { return json({ error: 'payment agent unavailable' }, 503); }
        return json(responseOrder(order), 201);
      });
    }

    const match = path.match(/^\/order\/([^/]+)$/);
    if (request.method === 'GET' && match) {
      let id: string;
      try { id = decodeURIComponent(match[1]).toLowerCase(); } catch { return json({ error: 'invalid order id' }, 400); }
      if (!UUID.test(id)) return json({ error: 'invalid order id' }, 400);
      return serialize(async () => {
        if (!healthy) return json({ error: 'payment agent unavailable' }, 503);
        try { await refreshOrder?.(id); }
        catch { unhealthy(); return json({ error: 'payment agent unavailable' }, 503); }
        const order = agent.get(id);
        if (!order) return json({ error: 'unknown order' }, 404);
        try {
          validOrder(order, id, formatXmrAmount(parseXmrAmount(order.amount)));
        } catch { unhealthy(); return json({ error: 'invalid stored payment order' }, 503); }
        try { await durable(); } catch { return json({ error: 'payment agent unavailable' }, 503); }
        let syncing = true;
        try { syncing = getSyncing ? await getSyncing() : true; } catch { syncing = true; }
        return json({
          id: order.id,
          address: order.address,
          paid: order.paid === true,
          status: order.status,
          amount: order.amount,
          receivedXmr: order.receivedXmr ?? 0,
          pendingXmr: order.pendingXmr,
          lockedXmr: order.lockedXmr,
          shortfallXmr: order.shortfallXmr,
          overpaid: order.overpaid ?? false,
          overpaidXmr: order.overpaidXmr ?? '0',
          confirmations: order.confirmations ?? 0,
          minConfirmations,
          syncing,
          txids: order.txids ?? [],
        });
      });
    }
    return json({ error: 'not found' }, 404);
  }) as OrderHandler;

  handler.markUnhealthy = unhealthy;
  handler.isHealthy = () => healthy;
  return handler;
}

const require = createRequire(import.meta.url);

export async function reconcilePaidOrders(scanner: Pick<any, 'checkOrders'>, orders: Map<string, XmrOrder>, minConfirmations: number): Promise<boolean> {
  const paid = [...orders.values()].filter(order => order.paid);
  if (!paid.length) return false;
  const results = await scanner.checkOrders(paid.map(({ id, index, amount, birthdayHeight }) => ({ id, index, amount, birthdayHeight })), { minConfirmations, toleranceXmr: '0', sync: false });
  let changed = false;
  const { toInvoiceState } = require('xmr-pay/state') as { toInvoiceState(status: string): string | null };
  for (const order of paid) {
    const result = results.get(order.id);
    if (!result) throw new Error('incomplete xmr reorg reconciliation snapshot');
    if (result.paid) continue;
    order.status = result.status;
    order.state = toInvoiceState(result.status) ?? order.state;
    order.paid = false;
    order.receivedXmr = result.receivedXmr;
    order.receivedPico = result.receivedPico;
    order.pendingXmr = result.pendingXmr;
    order.lockedXmr = result.lockedXmr;
    order.shortfallXmr = result.shortfallXmr;
    order.overpaid = !!result.overpaid;
    order.overpaidXmr = result.overpaidXmr ?? '0';
    order.confirmations = result.confirmations;
    order.txids = result.txids;
    changed = true;
  }
  return changed;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function validStoredOrder(value: unknown, id: string, network: 'mainnet' | 'stagenet' | 'testnet'): XmrOrder {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid xmr agent order ledger');
  const order = value as XmrOrder;
  const prefix = { mainnet: '48', stagenet: '57', testnet: '9B' }[network];
  if (order.id !== id || typeof order.amount !== 'string' || formatXmrAmount(parseXmrAmount(order.amount)) !== order.amount ||
    typeof order.address !== 'string' || !ADDRESS.test(order.address) || !prefix.includes(order.address[0]) ||
    !Number.isSafeInteger(order.index) || Number(order.index) < 0 ||
    (order.birthdayHeight != null && (!Number.isSafeInteger(order.birthdayHeight) || Number(order.birthdayHeight) < 0)) ||
    typeof order.status !== 'string' || !STATUSES.has(order.status) || typeof order.paid !== 'boolean' || order.paid !== (order.status === 'paid') ||
    (order.receivedXmr !== undefined && !validNumber(order.receivedXmr)) ||
    (order.pendingXmr !== undefined && !validNumber(order.pendingXmr)) ||
    (order.lockedXmr !== undefined && !validNumber(order.lockedXmr)) ||
    (order.confirmations !== undefined && !validNumber(order.confirmations, true))) {
    throw new Error('invalid xmr agent order ledger');
  }
  return order;
}

export async function validateWalletLedger(scanner: Pick<any, 'addressAt'>, orders: Map<string, XmrOrder>, primaryAddress: string): Promise<void> {
  try {
    if (await scanner.addressAt(0) !== primaryAddress) throw new Error();
    for (const order of orders.values()) {
      if (await scanner.addressAt(order.index) !== order.address) throw new Error();
    }
  } catch {
    throw new Error('xmr wallet and order ledger do not match');
  }
}

export async function startXmrAgent(): Promise<{ port: number; stop(force?: boolean): Promise<void> }> {
  process.umask(0o077);
  const token = required('XMR_AGENT_TOKEN');
  if (token.length < 32 || /[\r\n]/.test(token)) throw new Error('XMR_AGENT_TOKEN must have at least 32 characters');
  const databaseUrl = required('DONATION_DATABASE_URL');
  const primaryAddress = required('XMR_PRIMARY_ADDRESS');
  const privateViewKey = required('XMR_VIEW_KEY');
  const walletPath = required('XMR_WALLET_PATH');
  const restoreHeightText = required('XMR_RESTORE_HEIGHT');
  if (!/^\d+$/.test(restoreHeightText) || !Number.isSafeInteger(Number(restoreHeightText))) throw new Error('XMR_RESTORE_HEIGHT must be a nonnegative safe integer');
  const restoreHeight = Number(restoreHeightText);
  const network = (process.env.XMR_NETWORK || 'stagenet') as 'mainnet' | 'stagenet' | 'testnet';
  if (!['mainnet', 'stagenet', 'testnet'].includes(network)) throw new Error('XMR_NETWORK must be mainnet, stagenet or testnet');
  const { nodesFromEnv } = require('xmr-pay/nodes') as { nodesFromEnv(env: NodeJS.ProcessEnv): unknown[] };
  const nodes = nodesFromEnv(process.env);
  const sql = new Bun.SQL(databaseUrl);
  let lock: Awaited<ReturnType<typeof sql.reserve>> | undefined;
  let lockBackendPid = 0;
  let lockGuard: ReturnType<typeof createWriterLockGuard> | undefined;
  let lockMonitor: ReturnType<typeof setInterval> | undefined;
  let scanner: any;
  let paymentAgent: PaymentAgent | undefined;
  let poller: ReturnType<typeof createAgentPoller> | undefined;
  let server: ReturnType<typeof Bun.serve> | undefined;
  let markHostUnhealthy = () => {};
  const assertWriterLock = (): Promise<void> => {
    if (!lock || !lockGuard || !lockBackendPid) return Promise.reject(new Error('xmr agent writer lock is unavailable'));
    return lockGuard.assert();
  };
  try {
    lock = await sql.reserve({ signal: AbortSignal.timeout(5000) });
    const locks = await lock<{ acquired: boolean; pid: number }[]>`SELECT pg_backend_pid() AS pid, pg_try_advisory_lock(${LOCK_ID}::bigint) AS acquired`;
    if (!locks[0]?.acquired) throw new Error('another xmr payment agent owns the database');
    lockBackendPid = Number(locks[0].pid);
    lockGuard = createWriterLockGuard({
      backendPid: lockBackendPid,
      checkOwnership: async () => {
      const rows = await lock!<{ pid: number; held: boolean }[]>`SELECT pg_backend_pid() AS pid,
        EXISTS (
          SELECT 1 FROM pg_locks
          WHERE locktype = 'advisory' AND pid = pg_backend_pid() AND granted AND objsubid = 1
            AND classid = ((${LOCK_ID}::bigint >> 32) & 4294967295)::oid
            AND objid = (${LOCK_ID}::bigint & 4294967295)::oid
        ) AS held`;
        return { pid: Number(rows[0]?.pid), held: rows[0]?.held === true };
      },
      onLost: () => markHostUnhealthy(),
    });
    await assertWriterLock();
    await sql`CREATE TABLE IF NOT EXISTS xmr_agent_orders (
      order_id uuid PRIMARY KEY,
      order_data jsonb NOT NULL
    )`;
    const rows = await sql<{ order_id: string; order_data: unknown }[]>`SELECT order_id, order_data FROM xmr_agent_orders`;
    const orders = new Map<string, XmrOrder>();
    const usedIndexes = new Set<number>();
    for (const row of rows) {
      const order = validStoredOrder(row.order_data, row.order_id, network);
      if (usedIndexes.has(Number(order.index))) throw new Error('duplicate xmr subaddress index in order ledger');
      usedIndexes.add(Number(order.index));
      orders.set(order.id, order);
    }

    const { createScanner } = require('xmr-pay/scanner') as { createScanner(options: Record<string, unknown>): Promise<any> };
    scanner = await createScanner({
      primaryAddress,
      privateViewKey,
      networkType: network,
      nodes,
      restoreHeight,
      path: walletPath,
      password: process.env.XMR_WALLET_PASSWORD || '',
      syncTimeoutMs: 120000,
    });
    if (scanner.viewOnly !== true) throw new Error('refusing to start xmr agent without a view-only wallet');
    await validateWalletLedger(scanner, orders, primaryAddress);

    let persistTail = Promise.resolve();
    let paidCallbackTail = Promise.resolve();
    const serializeWrites = <T>(operation: () => Promise<T>): Promise<T> => {
      const save = persistTail.then(operation, operation);
      persistTail = save.then(() => undefined, () => undefined);
      return save;
    };
    let scannerWorkTail = Promise.resolve();
    const withScannerWork = <T>(operation: () => Promise<T>): Promise<T> => {
      const work = scannerWorkTail.then(operation, operation);
      scannerWorkTail = work.then(() => undefined, () => undefined);
      return work;
    };
    const saveOrderSnapshot = async () => {
      await assertWriterLock();
      const snapshot = [...orders.values()].map(order => ({ id: order.id, json: JSON.stringify(order) }));
      await sql.begin(async tx => {
        await tx`DELETE FROM xmr_agent_orders`;
        for (const row of snapshot) {
          await tx`INSERT INTO xmr_agent_orders (order_id, order_data) VALUES (${row.id}::uuid, ${row.json}::jsonb)`;
        }
      });
    };
    const saveWallet = () => serializeWrites(() => withScannerWork(async () => { await assertWriterLock(); await scanner.save(); }));
    const persistOrders = () => serializeWrites(saveOrderSnapshot);
    const persistAgentUpdate = () => serializeWrites(async () => {
      await withScannerWork(async () => { await assertWriterLock(); await scanner.save(); });
      await saveOrderSnapshot();
    });
    const persistPaidUpdate = () => {
      const save = paidCallbackTail.then(persistAgentUpdate, persistAgentUpdate).catch(failClosed);
      paidCallbackTail = save.then(() => undefined, () => undefined);
      return save;
    };
    let handler: OrderHandler | undefined;
    const failClosed = () => {
      handler?.markUnhealthy();
      if (lockMonitor) clearInterval(lockMonitor);
      lockMonitor = undefined;
      void poller?.stop();
      paymentAgent?.stop();
    };
    markHostUnhealthy = failClosed;
    let updateTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleUpdateSave = () => {
      if (updateTimer) return;
      updateTimer = setTimeout(() => {
        updateTimer = undefined;
        void persistAgentUpdate().catch(failClosed);
      }, 1000);
      updateTimer.unref?.();
    };
    const { createPaymentAgent } = require('xmr-pay/agent') as { createPaymentAgent(options: Record<string, unknown>): PaymentAgent };
    paymentAgent = createPaymentAgent({
      scanner,
      store: orders,
      minConfirmations: 10,
      toleranceXmr: '0',
      pollMs: 15000,
      activePollMs: 3000,
      expiryMs: 0,
      paidRetentionMs: 0,
      onUpdate: scheduleUpdateSave,
      onPaid: () => {
        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = undefined;
        return persistPaidUpdate();
      },
    });
    const refreshPaidOrders = async (id?: string, checkUnpaid = false) => {
      let changed = false;
      await withScannerWork(async () => {
        await assertWriterLock();
        await scanner.sync();
        const target = new Map<string, XmrOrder>();
        if (id) {
          const order = orders.get(id);
          if (order?.paid) target.set(id, order);
        } else {
          for (const [orderId, order] of orders) target.set(orderId, order);
        }
        changed = await reconcilePaidOrders(scanner, target, 10);
        if (checkUnpaid) {
          for (const order of paymentAgent!.list()) if (!order.paid) await paymentAgent!.check(order.id, { sync: false });
        }
      });
      if (changed) await persistAgentUpdate();
    };
    const hostAgent: Pick<PaymentAgent, 'get' | 'createOrder'> = {
      get: id => paymentAgent!.get(id),
      createOrder: input => withScannerWork(async () => {
        await assertWriterLock();
        const order = await paymentAgent!.createOrder(input);
        poller?.kick();
        return order;
      }),
    };
    handler = createOrderHandler({
      agent: hostAgent,
      saveWallet,
      persistOrders,
      onUnhealthy: failClosed,
      refreshOrder: id => refreshPaidOrders(id),
      getSyncing: async () => {
        try { return await withScannerWork(async () => {
          await assertWriterLock();
          const [walletHeight, daemonHeight] = await Promise.all([scanner.height(), scanner.daemonHeight()]);
          return !Number.isFinite(walletHeight) || !Number.isFinite(daemonHeight) || daemonHeight - walletHeight > 2;
        }); } catch { return true; }
      },
      minConfirmations: 10,
      network,
    });
    await refreshPaidOrders();
    poller = createAgentPoller({
      assertLock: assertWriterLock,
      tick: async () => { await refreshPaidOrders(undefined, true); await paidCallbackTail; },
      isActive: () => paymentAgent!.list().some(order => !order.paid && order.createdAt != null && Date.now() - order.createdAt < 1800000),
      onFailure: failClosed,
    });
    lockMonitor = setInterval(() => { void assertWriterLock().catch(failClosed); }, 2000);
    lockMonitor.unref?.();
    await persistOrders();
    poller.start();

    const expectedToken = Buffer.from(`Bearer ${token}`);
    const activeRequests = new Set<Promise<Response>>();
    server = Bun.serve({
      hostname: '127.0.0.1',
      port: Number(process.env.XMR_AGENT_PORT || 8788),
      maxRequestBodySize: 4096,
      async fetch(request) {
        const operation = (async () => {
          const actualToken = Buffer.from(request.headers.get('authorization') || '');
          if (actualToken.length !== expectedToken.length || !timingSafeEqual(actualToken, expectedToken)) {
            return Response.json({ error: 'unauthorized' }, { status: 401, headers: { 'cache-control': 'no-store' } });
          }
          return handler!(request);
        })();
        activeRequests.add(operation);
        try { return await operation; }
        finally { activeRequests.delete(operation); }
      },
    });

    const listeningPort = Number(process.env.XMR_AGENT_PORT || 8788);
    let stopped = false;
    return {
      port: server.port ?? listeningPort,
      async stop(force = false) {
        if (stopped) return;
        stopped = true;
        await server?.stop(force);
        if (lockMonitor) clearInterval(lockMonitor);
        lockMonitor = undefined;
        await poller?.stop();
        paymentAgent?.stop();
        await Promise.allSettled([...activeRequests]);
        await Promise.resolve();
        await paidCallbackTail;
        await scannerWorkTail;
        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = undefined;
        try { await saveWallet(); await persistOrders(); await persistTail; }
        finally {
          await scanner.close(false);
          try { await lock!`SELECT pg_advisory_unlock(${LOCK_ID}::bigint)`; } catch { /* the session may have been lost */ }
          lock!.release();
          await sql.close();
        }
      },
    };
  } catch (error) {
    await server?.stop(true);
    if (lockMonitor) clearInterval(lockMonitor);
    lockMonitor = undefined;
    await poller?.stop();
    paymentAgent?.stop();
    if (scanner) await scanner.close(false);
    if (lock) {
      try { await lock`SELECT pg_advisory_unlock(${LOCK_ID}::bigint)`; } catch { /* connection may not own the advisory lock */ }
      lock.release();
    }
    await sql.close();
    throw error;
  }
}

if (import.meta.main) {
  const host = await startXmrAgent();
  console.log(`xmr payment agent listening on http://127.0.0.1:${host.port}`);
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    void host.stop(true).then(() => process.exit(0), () => process.exit(1));
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { cp, chmod, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

let recoveryStage = 'setup';

async function recover() {
  const databaseUrl = Bun.env.TEST_DATABASE_URL!;
  const db = new URL(databaseUrl);
  if (db.search)
    throw new Error(
      'TEST_DATABASE_URL query parameters are unsupported by the PostgreSQL backup commands',
    );
  const schema = `recovery_${randomUUID().replaceAll('-', '')}`;
  const root = await mkdtemp(path.join(tmpdir(), 'xmr-recovery-'));
  await chmod(root, 0o700);
  const walletDir = path.join(root, 'view-wallet');
  const savedWalletDir = path.join(root, 'wallet-backup');
  const archive = path.join(root, 'orders.dump');
  let sql: Bun.SQL | undefined;
  const cliEnv = {
    ...process.env,
    PGHOST: db.hostname,
    PGPORT: db.port || '5432',
    PGDATABASE: decodeURIComponent(db.pathname.slice(1)),
    PGUSER: decodeURIComponent(db.username),
    PGPASSWORD: decodeURIComponent(db.password),
  };
  const runPg = async (command: string, args: string[]) => {
    const proc = Bun.spawn([command, ...args], {
      env: cliEnv,
      stdout: 'ignore',
      stderr: 'ignore',
    });
    if ((await proc.exited) !== 0)
      throw new Error('isolated backup recovery command failed');
  };
  let source: any;
  let wallet: any;
  let restoredWallet: any;
  let schemaOwned = false;
  try {
    const mono = createRequire(import.meta.url)('monero-ts');
    recoveryStage = 'source wallet generation';
    source = await mono.createWalletFull({
      networkType: 'stagenet',
      password: '',
      proxyToWorker: false,
    });
    recoveryStage = 'primary address generation';
    const primaryAddress = await source.getAddress(0, 0);
    const privateViewKey = await source.getPrivateViewKey();
    recoveryStage = 'view-only wallet creation';
    wallet = await mono.createWalletFull({
      networkType: 'stagenet',
      primaryAddress,
      privateViewKey,
      restoreHeight: 0,
      path: walletDir,
      password: 'recovery-test',
      proxyToWorker: false,
    });
    recoveryStage = 'view-only check';
    assert.equal(await wallet.isViewOnly(), true);
    recoveryStage = 'subaddress allocation';
    const sub = await wallet.createSubaddress(0, 'recovery-test');
    const donationID = randomUUID();
    const amount = '0.012345678901';
    const address = sub.getAddress();
    const order = {
      id: donationID,
      address,
      amount,
      status: 'pending',
      state: 'created',
      paid: false,
      index: sub.getIndex(),
      birthdayHeight: 0,
    };

    recoveryStage = 'wallet save';
    await wallet.save();
    recoveryStage = 'wallet close';
    await wallet.close(false);
    wallet = null;
    recoveryStage = 'source wallet close';
    await source.close(false);
    source = null;
    await cp(`${walletDir}.keys`, `${savedWalletDir}.keys`);
    await cp(`${walletDir}.address.txt`, `${savedWalletDir}.address.txt`);

    sql = new Bun.SQL(databaseUrl);
    await sql.unsafe(`CREATE SCHEMA "${schema}"`);
    schemaOwned = true;
    await sql.unsafe(`CREATE TABLE "${schema}".donations (
      donation_id uuid PRIMARY KEY,
      amount text NOT NULL,
      address text UNIQUE,
      state text NOT NULL CHECK (state IN ('creating', 'ready', 'review')),
      CHECK (state <> 'ready' OR address IS NOT NULL),
      created_at timestamptz NOT NULL DEFAULT clock_timestamp()
    )`);
    await sql.unsafe(
      `CREATE INDEX donations_created_at_idx ON "${schema}".donations (created_at)`,
    );
    await sql.unsafe(
      `CREATE TABLE "${schema}".xmr_agent_orders (order_id uuid PRIMARY KEY, order_data jsonb NOT NULL)`,
    );
    await sql.unsafe(
      `INSERT INTO "${schema}".donations (donation_id, amount, address, state) VALUES ($1::uuid, $2, $3, 'ready')`,
      [donationID, amount, address],
    );
    await sql.unsafe(
      `INSERT INTO "${schema}".xmr_agent_orders (order_id, order_data) VALUES ($1::uuid, $2::jsonb)`,
      [donationID, JSON.stringify(order)],
    );
    await cp(walletDir, savedWalletDir, { recursive: true });

    await runPg('pg_dump', [
      '--format=custom',
      '--no-owner',
      '--no-privileges',
      '--schema',
      schema,
      '--file',
      archive,
    ]);
    recoveryStage = 'database restore';
    await rm(walletDir, { recursive: true, force: true });
    await rm(`${walletDir}.keys`, { force: true });
    await rm(`${walletDir}.address.txt`, { force: true });
    await sql.unsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await runPg('pg_restore', [
      '--exit-on-error',
      '--no-owner',
      '--no-privileges',
      '--dbname',
      cliEnv.PGDATABASE,
      archive,
    ]);
    await cp(savedWalletDir, walletDir, { recursive: true });
    await cp(`${savedWalletDir}.keys`, `${walletDir}.keys`);
    await cp(`${savedWalletDir}.address.txt`, `${walletDir}.address.txt`);

    restoredWallet = await mono.openWalletFull({
      path: walletDir,
      password: 'recovery-test',
      networkType: 'stagenet',
      proxyToWorker: false,
    });
    recoveryStage = 'restored view-only check';
    assert.equal(await restoredWallet.isViewOnly(), true);
    recoveryStage = 'restored ledger read';
    const rows = await sql!.unsafe<{ order_id: string; order_data: any }[]>(
      `SELECT order_id, order_data FROM "${schema}".xmr_agent_orders`,
    );
    assert.equal(rows.length, 1);
    const donations = await sql!.unsafe<
      { donation_id: string; amount: string; address: string; state: string }[]
    >(`SELECT donation_id, amount, address, state FROM "${schema}".donations`);
    assert.equal(donations.length, 1);
    const donation = donations[0];
    assert.equal(donation.donation_id, donationID);
    assert.equal(donation.amount, amount);
    assert.equal(donation.address, address);
    assert.equal(donation.state, 'ready');
    await assert.rejects(
      sql!.unsafe(
        `INSERT INTO "${schema}".donations (donation_id, amount, address, state) VALUES ($1::uuid, $2, $3, 'ready')`,
        [randomUUID(), amount, address],
      ),
    );
    recoveryStage = 'restored order validation';
    const restoredOrder =
      typeof rows[0].order_data === 'string'
        ? JSON.parse(rows[0].order_data)
        : rows[0].order_data;
    recoveryStage = 'restored donation ID check';
    assert.equal(restoredOrder.id, donationID);
    recoveryStage = 'restored amount check';
    assert.equal(restoredOrder.amount, amount);
    assert.equal(restoredOrder.status, 'pending');
    assert.equal(restoredOrder.state, 'created');
    recoveryStage = 'restored address check';
    assert.equal(restoredOrder.address, order.address);
    recoveryStage = 'restored subaddress index check';
    assert.equal(restoredOrder.index, order.index);
    assert.equal(restoredOrder.id, donation.donation_id);
    assert.equal(restoredOrder.amount, donation.amount);
    assert.equal(restoredOrder.address, donation.address);
    const orders = new Map([[restoredOrder.id, restoredOrder]]);
    recoveryStage = 'wallet ledger validation';
    const { validateWalletLedger } = await import('../src/xmr/agent-host');
    await validateWalletLedger(
      {
        addressAt: async (index: number) => restoredWallet.getAddress(0, index),
      },
      orders,
      primaryAddress,
    );
    assert.equal(
      await restoredWallet.getAddress(0, order.index),
      order.address,
    );
  } finally {
    for (const handle of [restoredWallet, wallet, source])
      if (handle) {
        try {
          await handle.close(true);
        } catch {}
      }
    if (sql) {
      if (schemaOwned) {
        try {
          await sql.unsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        } catch {}
      }
      await sql.close();
    }
    await rm(root, { recursive: true, force: true });
  }
}

if (process.argv.includes('--recovery-child')) {
  recover().catch(() => {
    process.stderr.write(`recovery failed during ${recoveryStage}`);
    process.exitCode = 1;
  });
} else {
  const enabled =
    Bun.env.TEST_WALLET_RECOVERY === '1' && !!Bun.env.TEST_DATABASE_URL;
  const { test, expect } = await import('bun:test');
  test.skipIf(!enabled)(
    'restores a stopped stagenet view-only wallet and its isolated order ledger',
    async () => {
      const child = Bun.spawn(
        [process.execPath, import.meta.path, '--recovery-child'],
        { stdout: 'ignore', stderr: 'inherit' },
      );
      expect(await child.exited).toBe(0);
    },
    60_000,
  );
}

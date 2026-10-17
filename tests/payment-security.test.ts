import { expect, test } from 'bun:test';
import { createRequire } from 'node:module';

const { createScanner } = createRequire(import.meta.url)('xmr-pay/scanner');
const ID = 'order-1';

function transfer({
  amount,
  txid = 'a'.repeat(64),
  height = 200,
  confirmations = 10,
  pool = false,
  locked = false,
  doubleSpendSeen = false,
  index = 7,
}: {
  amount: bigint;
  txid?: string;
  height?: number;
  confirmations?: number;
  pool?: boolean;
  locked?: boolean;
  doubleSpendSeen?: boolean;
  index?: number;
}) {
  return {
    getAmount: () => amount,
    getSubaddressIndex: () => index,
    getTx: () => ({
      getHash: () => txid,
      getHeight: () => height,
      getNumConfirmations: () => confirmations,
      getIsConfirmed: () => !pool,
      getInTxPool: () => pool,
      getUnlockTime: () => (locked ? 10_000 : 0),
      getIsDoubleSpendSeen: () => doubleSpendSeen,
    }),
  };
}

async function scannerWith(
  transfers: ReturnType<typeof transfer>[],
  sync: () => Promise<void> = async () => {},
) {
  const wallet = {
    setDaemonConnection: async () => {},
    isConnectedToDaemon: async () => true,
    isViewOnly: async () => true,
    sync,
    getTransfers: async () => transfers,
    getAddress: async () => 'address',
    close: async () => {},
  };
  return createScanner({
    primaryAddress: 'address',
    privateViewKey: 'view-key',
    restoreHeight: 100,
    nodes: ['http://127.0.0.1:18081'],
    monero: { createWalletFull: async () => wallet },
  });
}

test('scanner deduplicates repeated transaction rows and double spend cannot count as confirmed', async () => {
  const scanner = await scannerWith([
    transfer({ amount: 10_000_000_000n, txid: 'b'.repeat(64) }),
    transfer({ amount: 10_000_000_000n, txid: 'b'.repeat(64) }),
    transfer({
      amount: 10_000_000_000n,
      txid: 'c'.repeat(64),
      doubleSpendSeen: true,
    }),
  ]);
  try {
    const result = await scanner.checkOrder({
      subaddressIndex: 7,
      amount: '0.02',
      minConfirmations: 10,
      sync: false,
    });
    expect(result.paid).toBe(false);
    expect(result.receivedPico).toBe('10000000000');
    expect(result.pendingXmr).toBe(0.01);
  } finally {
    await scanner.close();
  }
});

test('time-locked and mempool value remain separate from confirmed value', async () => {
  const scanner = await scannerWith([
    transfer({ amount: 10_000_000_000n, txid: 'd'.repeat(64), locked: true }),
    transfer({
      amount: 10_000_000_000n,
      txid: 'e'.repeat(64),
      pool: true,
      height: 0,
      confirmations: 0,
    }),
  ]);
  try {
    const result = await scanner.checkOrder({
      subaddressIndex: 7,
      amount: '0.02',
      minConfirmations: 10,
      sync: false,
    });
    expect(result.status).toBe('partial');
    expect(result.receivedPico).toBe('0');
    expect(result.lockedXmr).toBe(0.01);
    expect(result.pendingXmr).toBe(0.01);
  } finally {
    await scanner.close();
  }
});

test('separate partial transfers sum exactly in pico units', async () => {
  const scanner = await scannerWith([
    transfer({ amount: 5_000_000_001n, txid: 'f'.repeat(64) }),
    transfer({ amount: 4_999_999_999n, txid: '1'.repeat(64) }),
  ]);
  try {
    const result = await scanner.checkOrder({
      subaddressIndex: 7,
      amount: '0.01',
      minConfirmations: 10,
      sync: false,
    });
    expect(result.paid).toBe(true);
    expect(result.receivedPico).toBe('10000000000');
  } finally {
    await scanner.close();
  }
});

test('scanner sync outage rejects instead of returning a potentially stale payment result', async () => {
  const scanner = await scannerWith([], async () => {
    throw new Error('node unavailable');
  });
  try {
    await expect(
      scanner.checkOrder({ subaddressIndex: 7, amount: '0.01' }),
    ).rejects.toThrow('node unavailable');
  } finally {
    await scanner.close();
  }
});

test('order birthday grace boundary is inclusive and older rows are excluded', async () => {
  const scanner = await scannerWith([
    transfer({ amount: 1_000_000_000n, txid: '2'.repeat(64), height: 97 }),
    transfer({ amount: 9_000_000_000n, txid: '3'.repeat(64), height: 96 }),
  ]);
  try {
    const results = await scanner.checkOrders(
      [{ id: ID, index: 7, amount: '0.01', birthdayHeight: 100 }],
      { minConfirmations: 10, sync: false },
    );
    const result = results.get(ID);
    expect(result.paid).toBe(false);
    expect(result.receivedPico).toBe('1000000000');
    expect(result.shortfallXmr).toBe('0.009');
  } finally {
    await scanner.close();
  }
});

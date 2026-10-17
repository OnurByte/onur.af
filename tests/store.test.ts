import { afterAll, beforeAll, expect, test } from 'bun:test';
import assert from 'node:assert/strict';
import {
  createDonationStore,
  DonationCapacityError,
} from '../src/donations/store';

const databaseUrl = Bun.env['TEST_DATABASE_URL'];
const store = databaseUrl ? createDonationStore(databaseUrl) : null;
const sql = databaseUrl ? new Bun.SQL(databaseUrl) : null;
const ids: string[] = [];
const newId = () => {
  const id = crypto.randomUUID();
  ids.push(id);
  return id;
};

beforeAll(async () => {
  await store?.initialize();
});
afterAll(async () => {
  if (sql)
    for (const id of ids)
      await sql`DELETE FROM donations WHERE donation_id = ${id}::uuid`;
  await sql?.close();
  await store?.close();
});

test.skipIf(!databaseUrl)(
  'caps new donations at 30 per minute while allowing an existing ready id',
  async () => {
    const start = ids.length;
    try {
      const batch = await Promise.all(
        Array.from({ length: 30 }, () => store!.reserve(newId(), '0.01')),
      );
      expect(batch.every((result) => result.created)).toBe(true);

      const first = batch[0];
      assert.ok(first);
      const readyId = first.donation.id;
      const address = '8' + '1'.repeat(94);
      await store!.attach(readyId, address);
      const repeat = await store!.reserve(readyId, '0.01');
      expect(repeat.created).toBe(false);
      expect(repeat.donation).toMatchObject({
        id: readyId,
        address,
        state: 'ready',
      });

      await expect(store!.reserve(newId(), '0.01')).rejects.toBeInstanceOf(
        DonationCapacityError,
      );
    } finally {
      if (sql) {
        for (const id of ids.slice(start))
          await sql`DELETE FROM donations WHERE donation_id = ${id}::uuid`;
        ids.splice(start);
      }
    }
  },
  { timeout: 15000 },
);

test.skipIf(!databaseUrl)(
  'PostgreSQL donation reservation is durable and fails closed on retries',
  async () => {
    const id = newId();
    const first = await store!.reserve(id, '0.0500');
    expect(first).toEqual({
      donation: { id, amount: '0.05', address: null, state: 'creating' },
      created: true,
    });

    const retry = await store!.reserve(id, '0.05');
    expect(retry.created).toBe(false);
    expect(retry.donation.state).toBe('review');
    expect(await store!.get(id)).toEqual(retry.donation);
    await expect(store!.reserve(id, '0.06')).rejects.toThrow(
      'different amount',
    );
  },
);

test.skipIf(!databaseUrl)(
  'concurrent retries create one reservation and put the ambiguous loser in review',
  async () => {
    const id = newId();
    const results = await Promise.all([
      store!.reserve(id, '0.25'),
      store!.reserve(id, '0.25'),
    ]);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(results.filter((result) => !result.created)).toHaveLength(1);
    expect(await store!.get(id)).toMatchObject({
      id,
      amount: '0.25',
      state: 'review',
    });
  },
);

test.skipIf(!databaseUrl)(
  'address attachment is idempotent and cannot be replaced',
  async () => {
    const id = newId();
    await store!.reserve(id, '0.1');
    const address = '8' + '1'.repeat(94);
    expect(await store!.attach(id, address)).toMatchObject({
      id,
      address,
      state: 'ready',
    });
    expect(await store!.attach(id, address)).toMatchObject({
      id,
      address,
      state: 'ready',
    });
    await expect(store!.attach(id, '8' + '2'.repeat(94))).rejects.toThrow(
      'cannot be changed',
    );

    const reopened = createDonationStore(databaseUrl!);
    try {
      await reopened.initialize();
      expect(await reopened.get(id)).toEqual(await store!.get(id));
    } finally {
      await reopened.close();
    }

    const other = newId();
    await store!.reserve(other, '0.2');
    await expect(store!.attach(other, address)).rejects.toThrow();
  },
);

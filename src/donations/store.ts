import { formatXmrAmount, parseXmrAmount } from './money';

export type DonationState = 'creating' | 'ready' | 'review';

export interface Donation {
  id: string;
  amount: string;
  address: string | null;
  state: DonationState;
}

export class DonationCapacityError extends Error {
  constructor() {
    super('donation creation limit reached; try again shortly');
    this.name = 'DonationCapacityError';
  }
}

type DonationRow = {
  donation_id: string;
  amount: string;
  address: string | null;
  state: DonationState;
};

function validId(id: string): void {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    throw new Error('donation id must be a UUID');
  }
}

function donation(row: DonationRow): Donation {
  return {
    id: row.donation_id,
    amount: row.amount,
    address: row.address,
    state: row.state,
  };
}

function validAddress(address: string): void {
  if (!/^[45789AB][1-9A-HJ-NP-Za-km-z]{94}$/.test(address))
    throw new Error('invalid donation address');
}

export function createDonationStore(databaseUrl: string) {
  if (!databaseUrl) throw new Error('database URL is required');
  const sql = new Bun.SQL(databaseUrl);
  const getDonation = async (id: string): Promise<Donation | null> => {
    validId(id);
    const rows = await sql<DonationRow[]>`
      SELECT donation_id, amount, address, state FROM donations WHERE donation_id = ${id}::uuid
    `;
    return rows[0] ? donation(rows[0]) : null;
  };

  return {
    async initialize(): Promise<void> {
      await sql`CREATE TABLE IF NOT EXISTS donations (
        donation_id uuid PRIMARY KEY,
        amount text NOT NULL,
        address text UNIQUE,
        state text NOT NULL CHECK (state IN ('creating', 'ready', 'review')),
        CHECK (state <> 'ready' OR address IS NOT NULL),
        created_at timestamptz NOT NULL DEFAULT clock_timestamp()
      )`;
      await sql`ALTER TABLE donations ADD COLUMN IF NOT EXISTS created_at timestamptz`;
      // Legacy rows lack timestamps, so exclude them from the rolling creation window.
      await sql`UPDATE donations SET created_at = clock_timestamp() - interval '2 minutes' WHERE created_at IS NULL`;
      await sql`ALTER TABLE donations ALTER COLUMN created_at SET DEFAULT clock_timestamp()`;
      await sql`ALTER TABLE donations ALTER COLUMN created_at SET NOT NULL`;
      await sql`CREATE INDEX IF NOT EXISTS donations_created_at_idx ON donations (created_at)`;
    },

    async reserve(
      id: string,
      amount: string,
    ): Promise<{ donation: Donation; created: boolean }> {
      validId(id);
      const canonicalAmount = formatXmrAmount(parseXmrAmount(amount));

      return sql.begin(async (tx) => {
        const existingReservation = async () => {
          const rows = await tx<DonationRow[]>`
            SELECT donation_id, amount, address, state
            FROM donations WHERE donation_id = ${id}::uuid FOR UPDATE
          `;
          const existing = rows[0];
          if (!existing) return null;
          if (existing.amount !== canonicalAmount)
            throw new Error(
              'donation id already reserved for a different amount',
            );

          // A crashed or timed-out allocation may already have created an address upstream.
          if (existing.state === 'creating') {
            const reviewed = await tx<DonationRow[]>`
              UPDATE donations SET state = 'review' WHERE donation_id = ${id}::uuid
              RETURNING donation_id, amount, address, state
            `;
            return { donation: donation(reviewed[0]), created: false as const };
          }
          return { donation: donation(existing), created: false as const };
        };

        const existing = await existingReservation();
        if (existing) return existing;

        // Serialize all new IDs across instances before checking the rolling limit.
        await tx`SELECT pg_advisory_xact_lock(20261011, 1)`;
        const afterLock = await existingReservation();
        if (afterLock) return afterLock;

        const recent = await tx<{ count: string }[]>`
          SELECT count(*)::text AS count FROM donations
          WHERE created_at >= clock_timestamp() - interval '1 minute'
        `;
        if (BigInt(recent[0]?.count ?? '0') >= 30n)
          throw new DonationCapacityError();

        const inserted = await tx<DonationRow[]>`
          INSERT INTO donations (donation_id, amount, address, state)
          VALUES (${id}::uuid, ${canonicalAmount}, NULL, 'creating')
          ON CONFLICT (donation_id) DO NOTHING
          RETURNING donation_id, amount, address, state
        `;
        if (inserted[0])
          return { donation: donation(inserted[0]), created: true };

        const conflict = await existingReservation();
        if (!conflict) throw new Error('donation reservation disappeared');
        return conflict;
      });
    },

    async attach(id: string, address: string): Promise<Donation> {
      validId(id);
      validAddress(address);
      const updated = await sql<DonationRow[]>`
        UPDATE donations SET address = ${address}, state = 'ready'
        WHERE donation_id = ${id}::uuid AND state IN ('creating', 'review') AND address IS NULL
        RETURNING donation_id, amount, address, state
      `;
      if (updated[0]) return donation(updated[0]);

      const existing = await getDonation(id);
      if (existing?.state === 'ready' && existing.address === address)
        return existing;
      if (!existing) throw new Error('donation reservation not found');
      throw new Error('donation address cannot be changed');
    },

    get: getDonation,

    async review(id: string): Promise<Donation> {
      validId(id);
      const updated = await sql<DonationRow[]>`
        UPDATE donations SET state = 'review' WHERE donation_id = ${id}::uuid
        RETURNING donation_id, amount, address, state
      `;
      if (!updated[0]) throw new Error('donation reservation not found');
      return donation(updated[0]);
    },

    close(): Promise<void> {
      return sql.close();
    },
  };
}

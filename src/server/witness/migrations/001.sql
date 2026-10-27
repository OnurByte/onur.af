CREATE TABLE IF NOT EXISTS witness_batches (
 id uuid PRIMARY KEY, sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(), manifest jsonb NOT NULL,
 signature text, receipt bytea, status text NOT NULL DEFAULT 'recorded'
 CHECK(status IN ('recorded','sealed','pending','bitcoin-verified'))
);
CREATE TABLE IF NOT EXISTS witness_subjects (
 id uuid PRIMARY KEY, log_id text NOT NULL, first_seen_at timestamptz NOT NULL,
 first_revision integer NOT NULL CHECK(first_revision > 0), event_id uuid UNIQUE NOT NULL,
 source_category text NOT NULL CHECK(source_category IN ('referral','direct-unknown')),
 referrer_hostname text, UNIQUE(id,log_id)
);
CREATE TABLE IF NOT EXISTS witness_aliases (
 log_id text NOT NULL, subject_id uuid NOT NULL, fingerprint_generation text NOT NULL,
 witness_hmac text NOT NULL CHECK(witness_hmac ~ '^[a-f0-9]{64}$'),
 PRIMARY KEY(log_id,fingerprint_generation,witness_hmac),
 FOREIGN KEY(subject_id,log_id) REFERENCES witness_subjects(id,log_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS witness_events (
 id uuid PRIMARY KEY REFERENCES witness_subjects(event_id),
 record jsonb NOT NULL, commitment text NOT NULL CHECK(commitment ~ '^[a-f0-9]{64}$'),
 batch_id uuid REFERENCES witness_batches(id), inclusion jsonb
);
CREATE TABLE IF NOT EXISTS witness_requests (
 request_hash text PRIMARY KEY, payload_hash text NOT NULL,
 event_id uuid NOT NULL REFERENCES witness_events(id), expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS witness_first_seen ON witness_subjects(log_id, first_seen_at);
CREATE INDEX IF NOT EXISTS witness_unsealed ON witness_events(id) WHERE batch_id IS NULL;
CREATE TABLE IF NOT EXISTS witness_limits (
 key text PRIMARY KEY, window_start timestamptz NOT NULL, count integer NOT NULL
);
CREATE TABLE IF NOT EXISTS witness_corrections (
 id uuid PRIMARY KEY, event_id uuid NOT NULL REFERENCES witness_events(id),
 created_at timestamptz NOT NULL DEFAULT now(), reason text NOT NULL, suppressed boolean NOT NULL
);
ALTER TABLE witness_corrections ADD COLUMN IF NOT EXISTS sequence bigint GENERATED ALWAYS AS IDENTITY;
ALTER TABLE witness_corrections ADD COLUMN IF NOT EXISTS record jsonb;
ALTER TABLE witness_corrections ADD COLUMN IF NOT EXISTS signature text;

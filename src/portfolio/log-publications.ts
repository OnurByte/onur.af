import { createHash } from 'node:crypto';
import { z } from 'astro/zod';
import type { LogEntry } from './log';
import { verifyBytes } from './proofs';
import type { KeyTrust } from './key-history';

const publicationEntrySchema = z
  .object({
    id: z.string().regex(/^[a-z]+-[a-z]+-[a-z]+$/),
    version: z.number().int().positive(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    proofSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();

const publicationManifestSchema = z
  .object({
    format: z.union([z.literal(1), z.literal(2)]),
    sequence: z.number().int().positive(),
    previousSha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .nullable(),
    entries: z.array(publicationEntrySchema).min(1),
  })
  .strict();

const publicationEditionSchema = z
  .object({
    manifest: z.string().min(1).max(2_000_000),
    signature: z
      .string()
      .max(32768)
      .startsWith('-----BEGIN PGP SIGNATURE-----'),
  })
  .strict();

const publicationStoreSchema = z
  .object({ editions: z.array(publicationEditionSchema).max(10000) })
  .strict();

export type LogPublicationEntry = z.infer<typeof publicationEntrySchema>;
export type LogPublicationManifest = z.infer<typeof publicationManifestSchema>;

type VerifiedLogPublicationEdition = {
  manifest: LogPublicationManifest;
  bytes: string;
  signature: string;
  sha256: string;
};

export type VerifiedLogPublications = {
  editions: VerifiedLogPublicationEdition[];
  latest?: VerifiedLogPublicationEdition;
};

function atSequence(
  trust: string | KeyTrust,
  sequence: number,
): string | KeyTrust {
  return typeof trust === 'string' ? trust : { ...trust, sequence };
}

const sha256 = (bytes: string) =>
  createHash('sha256').update(bytes, 'utf8').digest('hex');

function compareEntries(a: LogPublicationEntry, b: LogPublicationEntry) {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : a.version - b.version;
}

/** Serialize a publication manifest to its one accepted signed byte format. */
export function canonicalLogPublication(
  manifest: LogPublicationManifest,
): string {
  const canonical = publicationManifestSchema.parse(manifest);
  return `${JSON.stringify(
    {
      format: canonical.format,
      sequence: canonical.sequence,
      previousSha256: canonical.previousSha256,
      entries: canonical.entries,
    },
    null,
    2,
  )}\n`;
}

/** Verify signatures, chain continuity, and append-only history without a live-set comparison. */
export async function verifyLogPublicationChain(
  input: unknown,
  publicKey: string | KeyTrust,
): Promise<VerifiedLogPublications> {
  const store = publicationStoreSchema.parse(input);
  const editions: VerifiedLogPublicationEdition[] = [];
  let previousBytes: string | undefined;
  let previousEntries = new Map<string, string>();
  let previousProofs = new Map<string, string>();

  for (const [index, artifact] of store.editions.entries()) {
    let decoded: unknown;
    try {
      decoded = JSON.parse(artifact.manifest);
    } catch {
      throw new Error(
        `Invalid Log publication manifest JSON: edition ${index + 1}`,
      );
    }
    const manifest = publicationManifestSchema.parse(decoded);
    const key = `${manifest.sequence}`.padStart(6, '0');
    if (manifest.sequence !== index + 1)
      throw new Error(`Log publication edition sequence gap: ${key}`);
    if (canonicalLogPublication(manifest) !== artifact.manifest)
      throw new Error(`Noncanonical Log publication manifest: edition ${key}`);
    if (
      manifest.previousSha256 !== (previousBytes ? sha256(previousBytes) : null)
    )
      throw new Error(`Log publication chain mismatch: edition ${key}`);
    await verifyBytes(
      artifact.manifest,
      artifact.signature,
      atSequence(publicKey, manifest.sequence),
    );

    if (
      manifest.format === 1 &&
      manifest.entries.some((item) => item.proofSha256)
    )
      throw new Error('Proof bindings require publication format 2');
    const currentEntries = new Map<string, string>();
    const currentProofs = new Map<string, string>();
    let priorOrder: LogPublicationEntry | undefined;
    for (const item of manifest.entries) {
      if (priorOrder && compareEntries(priorOrder, item) >= 0)
        throw new Error(
          `Unordered or duplicate Log publication entry: ${item.id}-v${item.version}`,
        );
      priorOrder = item;
      currentEntries.set(`${item.id}-v${item.version}`, item.sha256);
      if (item.proofSha256)
        currentProofs.set(`${item.id}-v${item.version}`, item.proofSha256);
    }
    for (const [id, digest] of previousEntries) {
      if (currentEntries.get(id) !== digest)
        throw new Error(
          `Log publication history changed or was removed: ${id}`,
        );
    }

    for (const [id, hash] of previousProofs)
      if (currentProofs.get(id) !== hash)
        throw new Error(`Publication proof changed or was removed: ${id}`);

    editions.push({
      manifest,
      bytes: artifact.manifest,
      signature: artifact.signature,
      sha256: sha256(artifact.manifest),
    });
    previousBytes = artifact.manifest;
    previousEntries = currentEntries;
    previousProofs = currentProofs;
  }

  const latest = editions.at(-1);
  return latest ? { editions, latest } : { editions };
}

/** Verify the signed chain and require its head to match the current Log set. */
export async function verifyLogPublications(
  entries: readonly LogEntry[],
  revisionDigests: Readonly<Record<string, { sha256: string }>>,
  input: unknown,
  publicKey: string | KeyTrust,
): Promise<VerifiedLogPublications> {
  const publications = await verifyLogPublicationChain(input, publicKey);
  const latest = publications.latest;
  if (latest) {
    const expected = entries
      .flatMap((entry) =>
        entry.revisions.map((revision) => {
          const id = `${entry.id}-v${revision.version}`;
          const digest = revisionDigests[id]?.sha256;
          if (!digest)
            throw new Error(`Missing verified Log signature for ${id}`);
          return { id: entry.id, version: revision.version, sha256: digest };
        }),
      )
      .sort(compareEntries);
    if (latest.manifest.entries.length !== expected.length)
      throw new Error(
        'Latest Log publication does not match the current Log set',
      );
    for (const [index, item] of expected.entries()) {
      const published = latest.manifest.entries[index];
      if (
        !published ||
        published.id !== item.id ||
        published.version !== item.version ||
        published.sha256 !== item.sha256
      )
        throw new Error(
          'Latest Log publication does not match the current Log set',
        );
    }
  }

  return publications;
}

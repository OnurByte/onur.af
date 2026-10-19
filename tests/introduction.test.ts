import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { introduction, introductionEntry } from '../src/portfolio/introduction';
import { logEntries, revisionMarkdown } from '../src/portfolio/log';
import { configuredKeyHistory } from '../src/portfolio/key-history';
import { verifyLogPublicationChain } from '../src/portfolio/log-publications';
import {
  revisionPublicationSequences,
  verifyLogSignatures,
} from '../src/portfolio/log-signatures';
import { validateLogTimestamps } from '../src/portfolio/log-timestamps';
import { verifyLogProofStore } from '../src/portfolio/log-proof-store';
import publications from '../src/content/log-publications.json';
import signatures from '../src/content/log-signatures.json';
import timestamps from '../src/content/log-timestamps.json';
import proofs from '../src/content/log-proofs.json';

const trust = {
  root: await readFile(new URL('../public/pgp.asc', import.meta.url), 'utf8'),
  history: configuredKeyHistory,
};
const chain = await verifyLogPublicationChain(publications, trust);
const sequences = revisionPublicationSequences(chain, logEntries);
const version = introductionEntry.revisions.at(-1)!.version;
const key = `${introductionEntry.id}-v${version}`;

test('home introduction is covered by a standard Log signature and publication edition', async () => {
  const verified = await verifyLogSignatures(
    logEntries,
    signatures,
    trust,
    sequences,
  );
  expect(verified[key]).toBeDefined();
  expect(
    chain.latest!.manifest.entries.some(
      (entry) => entry.id === introductionEntry.id && entry.version === version,
    ),
  ).toBe(true);
  const markdown = revisionMarkdown(introductionEntry, version);
  expect(markdown).toContain(introduction.heading);
  for (const paragraph of introduction.paragraphs)
    expect(markdown).toContain(paragraph);
});

test('home introduction has matching OpenTimestamps and portable proof receipts', async () => {
  const receipts = await validateLogTimestamps(
    logEntries,
    timestamps,
    signatures,
    trust,
    sequences,
  );
  expect(receipts[key]!.proofBytes.byteLength).toBeGreaterThan(0);
  const verified = await verifyLogSignatures(
    logEntries,
    signatures,
    trust,
    sequences,
  );
  const portable = await verifyLogProofStore(
    logEntries,
    proofs,
    verified,
    trust,
    new URL('../public', import.meta.url).pathname,
    true,
    sequences,
  );
  expect(portable[key]!.timestamp).toBeDefined();
});

import { expect, test } from 'bun:test';
import {
  evidenceFiles,
  checkEvidenceBindings,
} from '../../src/portfolio/transparency/evidence';
import {
  canonicalStatement,
  statementForManifest,
  transparencyDigest,
} from '../../src/portfolio/transparency/statement';
const manifest = '{"sequence":1,"previousSha256":null}\n';
const statement = canonicalStatement(
  statementForManifest(manifest, 'A'.repeat(40)),
);
const input = {
  statement,
  proof: 'version=2\n',
  policy: 'log ' + 'a'.repeat(64) + '\nquorum none\n',
  authority: '{}\n',
  authoritySignature: 'test',
  submitterPublicKey: 'test',
};
test('evidence inventory detects damage and independently pinned policy substitution', () => {
  const files = evidenceFiles(input);
  expect(
    checkEvidenceBindings(files, manifest, transparencyDigest(input.policy))
      .sequence,
  ).toBe(1);
  expect(() =>
    checkEvidenceBindings(
      files,
      manifest + ' ',
      transparencyDigest(input.policy),
    ),
  ).toThrow('manifest');
  expect(() => checkEvidenceBindings(files, manifest, 'b'.repeat(64))).toThrow(
    'policy',
  );
  files.set('publication.sigsum', new TextEncoder().encode('modified'));
  expect(() =>
    checkEvidenceBindings(files, manifest, transparencyDigest(input.policy)),
  ).toThrow('digest');
});
test('evidence does not accept unexpected files or canonical statement from another edition', () => {
  const files = evidenceFiles(input);
  files.set('surprise', new Uint8Array());
  expect(() =>
    checkEvidenceBindings(files, manifest, transparencyDigest(input.policy)),
  ).toThrow();
  const other = evidenceFiles({
    ...input,
    statement: canonicalStatement({
      ...statementForManifest(manifest, 'A'.repeat(40)),
      sequence: 2,
    }),
  });
  expect(() =>
    checkEvidenceBindings(other, manifest, transparencyDigest(input.policy)),
  ).toThrow('manifest');
});

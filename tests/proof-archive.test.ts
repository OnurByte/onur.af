import { expect, test } from 'bun:test';
import {
  encodeProofArchive,
  decodeProofArchive,
} from '../src/portfolio/proof-archive';
test('portable archive preserves byte files without timestamps or unsafe names', () => {
  const files = new Map([
    ['revisions/a.md', Buffer.from('hello\n')],
    ['media/00', Buffer.from([0, 255, 128])],
  ]);
  const archive = encodeProofArchive(files);
  const decoded = decodeProofArchive(archive);
  expect([...decoded.keys()]).toEqual([...files.keys()].sort());
  expect(decoded.get('media/00')).toEqual(files.get('media/00'));
  expect(encodeProofArchive(files)).toEqual(archive);
  expect(() =>
    encodeProofArchive(new Map([['../outside', Buffer.from('bad')]])),
  ).toThrow();
  const corrupt = Buffer.from(archive);
  corrupt[0] = 33;
  expect(() => decodeProofArchive(corrupt)).toThrow('checksum');
  expect(() => decodeProofArchive(archive.subarray(0, 600))).toThrow();
});

/** Deliberately narrow POSIX ustar: regular files only, bounded sizes, no links or extraction. */
const MAX_ARCHIVE = 256 * 1024 * 1024;
function safeName(name: string) {
  return (
    /^[a-zA-Z0-9._/-]+$/.test(name) &&
    Buffer.byteLength(name) <= 100 &&
    !name.startsWith('/') &&
    !name.split('/').some((part) => !part || part === '.' || part === '..')
  );
}
function octal(header: Buffer, offset: number, length: number, value: number) {
  const text = value.toString(8).padStart(length - 1, '0');
  if (text.length >= length) throw new Error('Archive field overflow');
  header.write(`${text}\0`, offset, length, 'ascii');
}
export function encodeProofArchive(
  files: ReadonlyMap<string, Uint8Array>,
): Buffer {
  const chunks: Buffer[] = [];
  let total = 1024;
  for (const [name, data] of [...files.entries()].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )) {
    if (!safeName(name)) throw new Error('Unsafe archive filename');
    total += 512 + Math.ceil(data.length / 512) * 512;
    if (total > MAX_ARCHIVE || files.size > 10000)
      throw new Error('Proof archive exceeds size limit');
    const header = Buffer.alloc(512);
    header.write(name, 0, 100, 'ascii');
    octal(header, 100, 8, 0o644);
    octal(header, 108, 8, 0);
    octal(header, 116, 8, 0);
    octal(header, 124, 12, data.length);
    octal(header, 136, 12, 0);
    header.fill(32, 148, 156);
    header[156] = 48;
    header.write('ustar\0', 257, 6, 'ascii');
    header.write('00', 263, 2, 'ascii');
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    header.write(
      `${checksum.toString(8).padStart(6, '0')}\0 `,
      148,
      8,
      'ascii',
    );
    chunks.push(
      header,
      Buffer.from(data),
      Buffer.alloc((512 - (data.length % 512)) % 512),
    );
  }
  chunks.push(Buffer.alloc(1024));
  return Buffer.concat(chunks);
}
export function decodeProofArchive(input: Uint8Array): Map<string, Buffer> {
  const bytes = Buffer.from(input);
  const files = new Map<string, Buffer>();
  if (bytes.length > MAX_ARCHIVE || bytes.length % 512 !== 0)
    throw new Error('Invalid archive length');
  let offset = 0;
  for (; offset + 512 <= bytes.length;) {
    const header = bytes.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      if (
        bytes.length - offset < 1024 ||
        !bytes.subarray(offset).every((byte) => byte === 0)
      )
        throw new Error('Invalid archive terminator');
      return files;
    }
    const text = (start: number, length: number) =>
      header
        .subarray(start, start + length)
        .toString('ascii')
        .split('\0')[0]!;
    const number = (start: number, length: number) => {
      const value = text(start, length).trim();
      if (!/^[0-7]+$/.test(value))
        throw new Error('Invalid archive numeric field');
      return parseInt(value, 8);
    };
    const checksum = number(148, 8);
    const actual = header.reduce(
      (sum, byte, index) => sum + (index >= 148 && index < 156 ? 32 : byte),
      0,
    );
    if (checksum !== actual)
      throw new Error('Archive header checksum mismatch');
    const name = text(0, 100),
      size = number(124, 12);
    if (
      !safeName(name) ||
      files.has(name) ||
      files.size >= 10000 ||
      text(345, 155) ||
      text(157, 100) ||
      text(257, 6) !== 'ustar' ||
      ![0, 48].includes(header[156]!)
    )
      throw new Error('Unsafe or unsupported archive entry');
    const end = offset + 512 + size;
    if (!Number.isSafeInteger(size) || end > bytes.length)
      throw new Error('Truncated archive file');
    files.set(name, bytes.subarray(offset + 512, end));
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  throw new Error('Archive missing terminator');
}

/** Bound allocation before reading an untrusted archive from disk. */
export async function readProofArchiveFile(path: string): Promise<Buffer> {
  const { open } = await import('node:fs/promises');
  const file = await open(path, 'r');
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > MAX_ARCHIVE)
      throw new Error('Proof archive exceeds size limit or is not a file');
    const bytes = Buffer.alloc(stat.size + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await file.read(
        bytes,
        offset,
        bytes.length - offset,
        null,
      );
      if (!bytesRead) break;
      offset += bytesRead;
    }
    if (offset !== stat.size)
      throw new Error('Proof archive changed while reading');
    return bytes.subarray(0, offset);
  } finally {
    await file.close();
  }
}

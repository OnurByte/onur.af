import { z } from 'astro/zod';
const maxQuoteLength = 65_536;
const pgpPublicKeySchema = z
  .string()
  .max(32_768)
  .regex(
    /^-----BEGIN PGP PUBLIC KEY BLOCK-----\r?\n(?:[A-Za-z][A-Za-z0-9-]*:[^\r\n]*\r?\n)*\r?\n(?:[A-Za-z0-9+/]{1,76}={0,2}\r?\n)+(?:=[A-Za-z0-9+/]{4}\r?\n)?-----END PGP PUBLIC KEY BLOCK-----$/,
    'Paste an armored PGP public key.',
  );
export const annotationSchema = z.strictObject({
  format: z.literal('onur-annotation-v1'),
  id: z.uuid(),
  logId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,127}$/),
  revision: z.number().int().positive(),
  revisionHash: z.string().regex(/^[a-f0-9]{64}$/),
  target: z.strictObject({
    normalization: z.literal('onur-text-v1'),
    quote: z.strictObject({
      exact: z.string().min(1).max(maxQuoteLength),
      prefix: z.string().max(32),
      suffix: z.string().max(32),
    }),
    position: z.strictObject({
      start: z.number().int().nonnegative(),
      end: z.number().int().positive(),
    }),
  }),
  body: z.string().min(1).max(2000),
  action: z.enum(['create', 'edit', 'withdraw', 'report']),
  sequence: z.number().int().positive(),
  publicKey: z.string().max(256),
  pgpPublicKey: pgpPublicKeySchema.optional(),
});
export interface TextTarget {
  normalization: 'onur-text-v1';
  quote: { exact: string; prefix: string; suffix: string };
  position: { start: number; end: number };
}
/** v1 uses DOM textContent verbatim, UTF-16 offsets, without Unicode or whitespace rewriting. */
export function anchorSelection(
  text: string,
  start: number,
  end: number,
): TextTarget {
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end <= start ||
    end > text.length ||
    end - start > maxQuoteLength
  )
    throw new Error('Invalid annotation selection');
  return {
    normalization: 'onur-text-v1',
    quote: {
      exact: text.slice(start, end),
      prefix: text.slice(Math.max(0, start - 32), start),
      suffix: text.slice(end, end + 32),
    },
    position: { start, end },
  };
}
export function resolveSelection(
  text: string,
  target: TextTarget,
): { start: number; end: number } | null {
  try {
    const actual = anchorSelection(
      text,
      target.position.start,
      target.position.end,
    );
    const parsed = annotationSchema.shape.target.parse(target);
    return parsed.quote.exact === actual.quote.exact &&
      parsed.quote.prefix === actual.quote.prefix &&
      parsed.quote.suffix === actual.quote.suffix
      ? actual.position
      : null;
  } catch {
    return null;
  }
}
export interface AnnotationPayload {
  format: 'onur-annotation-v1';
  id: string;
  logId: string;
  revision: number;
  revisionHash: string;
  target: TextTarget;
  body: string;
  action: 'create' | 'edit' | 'withdraw' | 'report';
  sequence: number;
  publicKey: string;
  pgpPublicKey?: string | undefined;
}
export function annotationBytes(p: AnnotationPayload): string {
  annotationSchema.parse(p);
  if (
    !/^[a-f0-9-]{36}$/.test(p.id) ||
    !/^[a-z0-9][a-z0-9-]{0,127}$/.test(p.logId) ||
    !Number.isSafeInteger(p.revision) ||
    p.revision < 1 ||
    !/^[a-f0-9]{64}$/.test(p.revisionHash) ||
    !Number.isSafeInteger(p.sequence) ||
    p.sequence < 1 ||
    !['create', 'edit', 'withdraw', 'report'].includes(p.action) ||
    typeof p.body !== 'string' ||
    !p.body.trim() ||
    p.body.length > 2000 ||
    typeof p.publicKey !== 'string' ||
    p.publicKey.length > 256
  )
    throw new Error('Invalid annotation');
  const t = p.target;
  if (
    !Number.isSafeInteger(t.position.start) ||
    t.position.start < 0 ||
    !Number.isSafeInteger(t.position.end) ||
    t.position.end <= t.position.start ||
    t.position.end - t.position.start !== t.quote.exact.length ||
    t.quote.exact.length > maxQuoteLength ||
    t.quote.prefix.length > 32 ||
    t.quote.suffix.length > 32
  )
    throw new Error('Invalid annotation target');
  return (
    JSON.stringify([
      p.format,
      p.id,
      p.logId,
      p.revision,
      p.revisionHash,
      t.normalization,
      t.position.start,
      t.position.end,
      t.quote.exact,
      t.quote.prefix,
      t.quote.suffix,
      p.body,
      p.action,
      p.sequence,
      p.publicKey,
      ...(p.pgpPublicKey === undefined ? [] : [p.pgpPublicKey]),
    ]) + '\n'
  );
}

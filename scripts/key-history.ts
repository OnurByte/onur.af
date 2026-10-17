import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readKey } from 'openpgp';
import { fileURLToPath } from 'node:url';
import {
  canonicalKeyTransition,
  validateKeyHistory,
  type KeyHistory,
} from '../src/portfolio/key-history';
import { readJsonFile } from '../src/server/json-file';

const rootFile = fileURLToPath(new URL('../public/pgp.asc', import.meta.url));
const historyFile = fileURLToPath(
  new URL('../src/content/key-history.json', import.meta.url),
);
const digest = (value: string) =>
  createHash('sha256').update(value, 'utf8').digest('hex');

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const root = await readFile(rootFile, 'utf8');
  const history = (await readJsonFile(historyFile)) as KeyHistory;
  const validated = await validateKeyHistory(root, history);
  if (command === '--check' && args.length === 0) {
    console.log(
      `${validated.transitions.length} key transition(s) verified against the pinned root.`,
    );
    return;
  }
  if (command === 'prepare' && args.length === 2) {
    const [certificateFile, rawEffective] = args;
    const effectivePublication = Number(rawEffective);
    if (!Number.isSafeInteger(effectivePublication) || effectivePublication < 1)
      throw new Error('effective-publication must be a positive integer');
    const fromCertificate = validated.transitions.at(-1)?.certificate ?? root;
    const fromFingerprint = (await readKey({ armoredKey: fromCertificate }))
      .getFingerprint()
      .toUpperCase();
    const certificate = await readFile(certificateFile!, 'utf8');
    const toFingerprint = (await readKey({ armoredKey: certificate }))
      .getFingerprint()
      .toUpperCase();
    const prior = validated.transitions.at(-1);
    const previousSha256 = prior
      ? digest(`${JSON.stringify(prior, null, 2)}\n`)
      : null;
    const payload = {
      domain: 'onurbyte-log-key-transition-v1' as const,
      format: 1 as const,
      sequence: validated.transitions.length + 1,
      previousSha256,
      fromFingerprint,
      toFingerprint,
      effectivePublication,
      certificate,
    };
    await writeFile(
      'key-transition-payload.json',
      canonicalKeyTransition(payload),
      { flag: 'wx' },
    );
    console.log(
      'Wrote key-transition-payload.json. Have the prior and new key owners sign these exact bytes before adding the transition to key-history.json.',
    );
    return;
  }
  if (command === 'verify' && args.length === 1) {
    const candidate = JSON.parse(await readFile(args[0]!, 'utf8')) as unknown;
    const checked = await validateKeyHistory(root, candidate);
    console.log(
      `${checked.transitions.length} transition(s) verified against public/pgp.asc.`,
    );
    return;
  }
  throw new Error(
    'Usage: bun scripts/key-history.ts --check | prepare <new-public-certificate.asc> <effective-publication> | verify <history.json>',
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Key history operation failed',
  );
  process.exitCode = 1;
});

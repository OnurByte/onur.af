import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { readJsonFile, writeJsonFile } from '../src/server/json-file';
import { logEntries } from '../src/portfolio/log';
import { buildLogBundle, verifyLogBundle } from '../src/portfolio/log-bundle';
import {
  decodeProofArchive,
  readProofArchiveFile,
} from '../src/portfolio/proof-archive';
import { assertPublicationReadable } from '../src/portfolio/publication-transaction';

await assertPublicationReadable(process.cwd());
const [command, target, ...args] = process.argv.slice(2);
if (command === 'export' && target) {
  const entry = logEntries.find((item) => item.id === target);
  if (!entry) throw new Error('Unknown Log ID');
  const [output, mode, ...extra] = args;
  if (!output || extra.length || (mode && mode !== '--directory'))
    throw new Error(
      'Usage: bun scripts/log-bundle.ts export <id> <path> [--directory]',
    );
  const bytes = await buildLogBundle({
    entry,
    signatures: (await readJsonFile(
      'src/content/log-signatures.json',
    )) as Record<string, { signature: string }>,
    proofs: await readJsonFile('src/content/log-proofs.json'),
    publications: await readJsonFile('src/content/log-publications.json'),
    checkpoints: await readJsonFile('src/content/publication-checkpoints.json'),
    timestamps: (await readJsonFile(
      'src/content/log-timestamps.json',
    )) as Record<string, { proof: string }>,
    root: await readFile('public/pgp.asc', 'utf8'),
    history: await readJsonFile('src/content/key-history.json'),
    publicDirectory: resolve('public'),
  });
  if (mode === '--directory') {
    // Never overwrite an existing directory or follow an existing leaf symlink.
    await mkdir(output);
    for (const [name, data] of decodeProofArchive(bytes)) {
      const path = join(output, name);
      await mkdir(join(path, '..'), { recursive: true });
      await writeFile(path, data, { flag: 'wx' });
    }
  } else await writeFile(output, bytes, { flag: 'wx' });
  console.log(`Exported ${entry.id} to ${output}`);
} else if (command === 'verify' && target) {
  const options = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    if (
      !['--fingerprint', '--checkpoint', '--save-checkpoint'].includes(
        args[i] ?? '',
      ) ||
      !args[i + 1] ||
      options.has(args[i]!)
    )
      throw new Error(
        'Usage: verify <archive.tar> --fingerprint <trusted-fingerprint> [--checkpoint <saved.json>] [--save-checkpoint <path>]',
      );
    options.set(args[i]!, args[i + 1]!);
  }
  const fingerprint = options.get('--fingerprint');
  if (!fingerprint)
    throw new Error('Reader must supply an independently trusted fingerprint');
  const checkpoint = options.get('--checkpoint');
  const result = await verifyLogBundle(
    await readProofArchiveFile(target),
    fingerprint,
    checkpoint ? await readJsonFile(checkpoint) : undefined,
  );
  const save = options.get('--save-checkpoint');
  if (save)
    await writeJsonFile(save, {
      ...result.checkpoint,
      publisher: result.fingerprint,
    });
  console.log(JSON.stringify(result, null, 2));
  console.log(
    'Offline checks passed. Bitcoin confirmation and latest-global-publication claims are not implied.',
  );
} else
  throw new Error(
    'Usage: bun scripts/log-bundle.ts export <id> <path> [--directory] | verify <archive.tar> --fingerprint <trusted-fingerprint>',
  );

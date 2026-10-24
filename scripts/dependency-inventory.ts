import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { z } from 'astro/zod';
const text = await readFile('bun.lock', 'utf8');
const parsed = ts.parseConfigFileTextToJson('bun.lock', text);
if (parsed.error) throw new Error('Cannot parse bun.lock');
const lock = z
  .object({ packages: z.record(z.string(), z.array(z.unknown())) })
  .parse(parsed.config);
const components = Object.entries(lock.packages).map(([key, entry]) => {
  const resolution = z.string().parse(entry[0]);
  const split = resolution.lastIndexOf('@');
  const name = resolution.slice(0, split);
  const version = resolution.slice(split + 1);
  const integrity = entry.find(
    (item): item is string =>
      typeof item === 'string' && item.startsWith('sha512-'),
  );
  return {
    type: 'library',
    'bom-ref': key,
    name,
    version,
    ...(integrity
      ? {
          hashes: [
            {
              alg: 'SHA-512',
              content: Buffer.from(integrity.slice(7), 'base64').toString(
                'hex',
              ),
            },
          ],
        }
      : {}),
    properties: [{ name: 'bun:resolution', value: resolution }],
  };
});
await mkdir('.local', { recursive: true });
await writeFile(
  '.local/sbom.cdx.json',
  JSON.stringify(
    {
      bomFormat: 'CycloneDX',
      specVersion: '1.6',
      version: 1,
      metadata: {
        component: { type: 'application', name: 'onur-portfolio' },
        properties: [
          {
            name: 'bun:lockfile:sha256',
            value: createHash('sha256').update(text).digest('hex'),
          },
        ],
      },
      components,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  `Dependency inventory: ${String(components.length)} exact locked components; .local/sbom.cdx.json`,
);

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { optimize } from 'svgo';

let before = 0;
let after = 0;
let count = 0;
for await (const name of new Bun.Glob('**/*.svg').scan('public/brand')) {
  const path = resolve('public/brand', name);
  const source = await readFile(path, 'utf8');
  const result = optimize(source, {
    path,
    multipass: true,
    floatPrecision: 8,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            cleanupIds: false,
            removeComments: false,
            removeDesc: false,
            removeUnknownsAndDefaults: false,
          },
        },
      },
    ],
  });
  before += Buffer.byteLength(source);
  after += Buffer.byteLength(result.data);
  if (Buffer.byteLength(result.data) < Buffer.byteLength(source))
    await writeFile(path, result.data + '\n');
  count++;
}
console.log(
  `${String(count)} SVGs: ${String(before)} → ${String(after)} bytes before final newlines`,
);

import { test, expect } from 'bun:test';
import {
  mkdtemp,
  cp,
  symlink,
  mkdir,
  writeFile,
  readFile,
  rm,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

(Bun.which('gpg') && Bun.which('gpgconf') ? test : test.skip)(
  'isolated Log publication prepares and verifies a complete portable proof without live calendars',
  async () => {
    const repository = process.cwd();
    const sandbox = await mkdtemp(join(tmpdir(), 'portable-pipeline-'));
    const root = join(sandbox, 'checkout'),
      home = join(sandbox, 'gpg'),
      bin = join(sandbox, 'bin');
    const realBun = process.execPath;
    await mkdir(root);
    await mkdir(home, { mode: 0o700 });
    await mkdir(bin);
    const env = {
      ...process.env,
      GNUPGHOME: home,
      SITE_URL: 'https://example.com',
      PATH: `${bin}:${process.env['PATH']}`,
    };
    const run = (args: string[]) =>
      execFileSync('bun', args, {
        cwd: root,
        env,
        encoding: 'utf8',
        timeout: 120000,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    try {
      for (const name of [
        'src',
        'scripts',
        'public',
        'integrations',
        'package.json',
        'astro.config.ts',
        'tsconfig.json',
      ])
        await cp(join(repository, name), join(root, name), {
          recursive: true,
        });
      await symlink(
        join(repository, 'node_modules'),
        join(root, 'node_modules'),
        'dir',
      );
      execFileSync(
        'gpg',
        [
          '--batch',
          '--pinentry-mode',
          'loopback',
          '--passphrase',
          '',
          '--quick-generate-key',
          'Pipeline Fixture <fixture@example.invalid>',
          'ed25519',
          'sign',
          '1d',
        ],
        { env, stdio: 'pipe' },
      );
      const key = execFileSync('gpg', ['--armor', '--export'], {
        env,
        encoding: 'utf8',
      });
      await writeFile(join(root, 'public/pgp.asc'), key);
      const save = async (name: string, value: unknown) =>
        writeFile(
          join(root, 'src/content', name),
          JSON.stringify(value, null, 2) + '\n',
        );
      await save('log.json', [
        {
          id: 'veiled-compass-turns',
          title: 'Isolated pipeline',
          summary: 'No owner key used',
          revisions: [
            {
              version: 1,
              publishedAt: '2026-10-18T00:00:00Z',
              body: 'A signed fixture with ![image](/media/fixture.png).',
            },
          ],
        },
      ]);
      await mkdir(join(root, 'public/media'), { recursive: true });
      await writeFile(
        join(root, 'public/media/fixture.png'),
        Buffer.from('frozen original fixture bytes'),
      );
      for (const name of [
        'log-signatures.json',
        'log-timestamps.json',
        'log-proofs.json',
        'publication-checkpoints.json',
        'source-archives.json',
      ])
        await save(name, {});
      await save('log-publications.json', { editions: [] });
      await save('key-history.json', { transitions: [] });
      await save('identity-proofs.json', []);
      await save('rss-signature.json', null);
      const preload = join(sandbox, 'offline-calendar.ts');
      await writeFile(
        preload,
        `import ots from ${JSON.stringify(join(repository, 'node_modules/opentimestamps/index.js'))};\nots.stamp=async(file)=>{file.timestamp.attestations.push(new ots.Notary.PendingAttestation('https://calendar.example'));};\nots.upgrade=async()=>false;\n`,
      );
      await writeFile(
        join(bin, 'bun'),
        `#!/bin/sh\nexec '${realBun}' --preload '${preload}' "$@"\n`,
        { mode: 0o755 },
      );
      run(['scripts/proofs.ts', 'identity-statement']);
      const publisher = ['scripts/publish-log.ts', 'veiled-compass-turns'];
      const published = run(publisher);
      expect(published).toContain('staged proofs');
      const proof = JSON.parse(
        await readFile(join(root, 'src/content/log-proofs.json'), 'utf8'),
      );
      const publications = JSON.parse(
        await readFile(join(root, 'src/content/log-publications.json'), 'utf8'),
      );
      if (
        !proof['veiled-compass-turns-v1']?.timestamp ||
        JSON.parse(publications.editions[0].manifest).format !== 2
      )
        throw new Error('Pipeline failed to activate v2 evidence');
      run([
        'scripts/log-bundle.ts',
        'export',
        'veiled-compass-turns',
        join(sandbox, 'proof.tar'),
      ]);
      const fingerprint = execFileSync(
        'gpg',
        ['--with-colons', '--list-keys'],
        { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      )
        .split('\n')
        .find((row) => row.startsWith('fpr:'))!
        .split(':')[9]!;
      execFileSync(
        realBun,
        [
          'build',
          'scripts/verify-log-bundle.ts',
          '--target=node',
          '--outfile=public/proof-verifier.mjs',
          '--banner',
          'import { createRequire as __proofCreateRequire } from "node:module"; const require = __proofCreateRequire(import.meta.url);',
        ],
        { cwd: root, env, stdio: 'pipe' },
      );
      const output = execFileSync(
        'node',
        [
          join(root, 'public/proof-verifier.mjs'),
          join(sandbox, 'proof.tar'),
          '--fingerprint',
          fingerprint,
        ],
        { encoding: 'utf8', timeout: 30000 },
      );
      if (
        !output.includes('text-and-original-media') ||
        !output.includes('pending')
      )
        throw new Error('Standalone verifier did not validate the new proof');
      expect(output).toContain('text-and-original-media');
      expect(output).toContain('pending');
      const retained = await readFile(
        join(root, 'src/content/log-signatures.json'),
        'utf8',
      );
      run(publisher);
      expect(
        await readFile(join(root, 'src/content/log-signatures.json'), 'utf8'),
      ).toBe(retained);
      expect(
        JSON.parse(
          await readFile(
            join(root, 'src/content/log-publications.json'),
            'utf8',
          ),
        ).editions.length,
      ).toBe(1);
    } catch (error) {
      const failure = error as {
        stderr?: Buffer | string;
        stdout?: Buffer | string;
      };
      console.error(failure.stdout?.toString(), failure.stderr?.toString());
      throw error;
    } finally {
      try {
        execFileSync('gpgconf', ['--homedir', home, '--kill', 'all'], {
          stdio: 'ignore',
        });
      } catch {}
      await rm(sandbox, { recursive: true, force: true });
    }
  },
  120000,
);

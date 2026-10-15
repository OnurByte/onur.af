import { expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { signXmlWithGpg, clearSignWithGpg } from '../src/portfolio/rss-signing';
import { verifyIdentitySignature } from '../src/portfolio/proofs';
import { rssDigest, verifyRssSignature } from '../src/portfolio/rss-signatures';

const hasGpg = Bun.which('gpg') !== null;
(hasGpg ? test : test.skip)(
  'real GPG signs exact XML; published-key verification rejects tampering',
  async () => {
    const home = await mkdtemp(join(tmpdir(), 'rss-gpg-test-'));
    const env = { ...process.env, GNUPGHOME: home };
    try {
      execFileSync(
        'gpg',
        [
          '--batch',
          '--pinentry-mode',
          'loopback',
          '--passphrase',
          '',
          '--quick-generate-key',
          'RSS Fixture <fixture@example.invalid>',
          'ed25519',
          'sign',
          '1d',
        ],
        { env, stdio: 'pipe' },
      );
      const publicKey = execFileSync('gpg', ['--armor', '--export'], {
        env,
        encoding: 'utf8',
      });
      const records = execFileSync('gpg', ['--with-colons', '--list-keys'], {
        env,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const fingerprint = records
        .split('\n')
        .find((line) => line.startsWith('fpr:'))
        ?.split(':')[9];
      if (!fingerprint) throw new Error('Missing fixture key');
      const xml =
        '<?xml version="1.0"?><rss version="2.0"><channel><title>Fixture</title></channel></rss>\n';
      await writeFile(join(home, 'gpg.conf'), 'textmode\n');
      const signature = await signXmlWithGpg(xml, fingerprint, env);

      const profile = 'https://x.com/onurstirner';
      const signedMessage = await clearSignWithGpg(profile, fingerprint, env);
      const identity = await verifyIdentitySignature(
        {
          id: 'x',
          profile,
          proofUrl: 'https://x.com/onurstirner/status/12345',
          publishedAt: new Date().toISOString(),
          signedMessage,
        },
        publicKey,
      );
      expect(identity.statement).toBe(profile);
      await writeFile(join(home, 'x.asc'), signedMessage);
      expect(
        execFileSync(
          'gpg',
          ['--batch', '--status-fd', '1', '--verify', join(home, 'x.asc')],
          { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
        ),
      ).toContain('[GNUPG:] VALIDSIG');
      const artifact = {
        version: 1,
        origin: 'https://example.com',
        sha256: rssDigest(xml),
        signature,
      };
      expect((await verifyRssSignature(xml, artifact, publicKey)).status).toBe(
        'signed',
      );
      await expect(
        verifyRssSignature(xml.trimEnd(), artifact, publicKey),
      ).rejects.toThrow();
    } finally {
      try {
        execFileSync('gpgconf', ['--kill', 'gpg-agent'], {
          env,
          stdio: 'ignore',
        });
      } catch {
        /* The temporary keyring is still removed if gpgconf is unavailable. */
      }
      await rm(home, { recursive: true, force: true });
    }
  },
  15000,
);

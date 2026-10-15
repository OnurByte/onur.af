import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const execute = promisify(execFile);
/** Local publishing tool only. Private key material stays inside GnuPG. */
export async function signXmlWithGpg(
  xml: string,
  fingerprint: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  return signWithGpg(xml, fingerprint, 'detached', env);
}

export async function clearSignWithGpg(
  text: string,
  fingerprint: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  return signWithGpg(text, fingerprint, 'cleartext', env);
}

async function signWithGpg(
  xml: string,
  fingerprint: string,
  mode: 'detached' | 'cleartext',
  env: NodeJS.ProcessEnv,
): Promise<string> {
  if (!/^[A-Fa-f0-9]{40,64}$/.test(fingerprint))
    throw new Error('Use a full signing-key fingerprint');
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-rss-sign-'));
  try {
    const data = join(directory, 'rss.xml');
    const signature = join(directory, 'rss.xml.asc');
    await writeFile(data, xml, { encoding: 'utf8', mode: 0o600 });
    try {
      await execute(
        'gpg',
        [
          '--batch',
          '--armor',
          ...(mode === 'detached'
            ? ['--no-textmode', '--detach-sign']
            : ['--clear-sign']),
          '--local-user',
          fingerprint,
          '--output',
          signature,
          data,
        ],
        { env, timeout: 120000, maxBuffer: 1024 * 1024 },
      );
    } catch {
      throw new Error(
        `GPG signing failed. Make sure the private signing key for ${fingerprint} is available and unlocked in your local GPG agent.`,
      );
    }
    return await readFile(signature, 'utf8');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

import { readFile } from 'node:fs/promises';
import { readJsonFile } from '../src/server/json-file';
import {
  loadConfiguredKeyTrust,
  type KeyTrust,
} from '../src/portfolio/key-history';
import { verifyLogPublicationChain } from '../src/portfolio/log-publications';

/** The pinned root key and its validated key history, resolved from the repository. */
export async function loadSiteTrust(): Promise<KeyTrust> {
  return loadConfiguredKeyTrust(
    await readFile(new URL('../public/pgp.asc', import.meta.url), 'utf8'),
    await readJsonFile(
      new URL('../src/content/key-history.json', import.meta.url),
    ),
  );
}

/** The signed Log publication chain, verified against `trust`. */
export async function loadPublicationChain(trust: KeyTrust) {
  return verifyLogPublicationChain(
    await readJsonFile(
      new URL('../src/content/log-publications.json', import.meta.url),
    ),
    trust,
  );
}

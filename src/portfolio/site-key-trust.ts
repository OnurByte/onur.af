import publicKey from '../../public/pgp.asc?raw';
import { configuredKeyHistory, loadConfiguredKeyTrust } from './key-history';

/** Shared promise for the pinned public trust configuration; no private key material. */
export const siteKeyTrust = loadConfiguredKeyTrust(
  publicKey,
  configuredKeyHistory,
);

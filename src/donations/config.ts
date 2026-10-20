/** Shared server-side Monero identity. Never add wallet credentials here. */
export function moneroConfiguration(
  env: Record<string, string | undefined> = {
    ...import.meta.env,
    ...process.env,
  },
) {
  return {
    network: env['XMR_NETWORK']?.trim() || 'stagenet',
    primaryAddress: env['XMR_PRIMARY_ADDRESS']?.trim() ?? '',
    openAlias: env['XMR_OPENALIAS']?.trim() ?? '',
  };
}

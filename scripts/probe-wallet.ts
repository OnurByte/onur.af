import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as mono from 'monero-ts';

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xmr-wasm-probe-'));
  fs.chmodSync(dir, 0o700);
  let source: mono.MoneroWalletFull | undefined;
  let view: mono.MoneroWalletFull | undefined;
  let reopened: mono.MoneroWalletFull | undefined;
  try {
    console.log('step: create random in-memory stagenet wallet');
    source = await mono.createWalletFull({
      networkType: mono.MoneroNetworkType.STAGENET,
      password: '',
      proxyToWorker: false,
    });
    const address = await source.getAddress(0, 0);
    const privateViewKey = await source.getPrivateViewKey();
    assert.match(
      address,
      /^[57]/,
      'generated address should use stagenet prefix',
    );

    console.log('step: create and persist view-only wallet; create subaddress');
    const walletPath = path.join(dir, 'view-wallet');
    view = await mono.createWalletFull({
      networkType: mono.MoneroNetworkType.STAGENET,
      primaryAddress: address,
      privateViewKey,
      restoreHeight: 0,
      path: walletPath,
      password: 'probe-only',
      proxyToWorker: false,
    });
    assert.equal(await view.isViewOnly(), true, 'wallet should be view-only');
    const before = await view.getAddress(0, 0);
    assert.equal(before, address, 'primary address should match');
    const sub = await view.createSubaddress(0, 'probe');
    const subaddress = sub.getAddress();
    assert.equal(typeof subaddress, 'string');
    assert.match(subaddress, /^[57]/, 'subaddress should use stagenet prefix');
    assert.equal(await view.getAddress(0, sub.getIndex()), subaddress);
    await view.save();
    await view.close(true);
    view = undefined;

    console.log('step: reopen persisted view-only wallet');
    reopened = await mono.openWalletFull({
      path: walletPath,
      password: 'probe-only',
      networkType: mono.MoneroNetworkType.STAGENET,
      proxyToWorker: false,
    });
    assert.equal(
      await reopened.isViewOnly(),
      true,
      'reopened wallet should remain view-only',
    );
    assert.equal(
      await reopened.getAddress(0, 0),
      address,
      'primary address should persist',
    );
    assert.equal(
      await reopened.getAddress(0, 1),
      subaddress,
      'subaddress should persist',
    );
    console.log(
      'result: PASS createWalletFull WASM, view-only import, subaddress, save/reopen',
    );
  } finally {
    for (const wallet of [reopened, view, source]) {
      if (wallet) {
        try {
          await wallet.close(true);
        } catch {}
      }
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(
    `result: FAIL ${error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error'}`,
  );
  process.exitCode = 1;
});

import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makePaymentURI, qrSvg } from 'xmr-pay/core';

const available = Bun.which('rsvg-convert') && Bun.which('zbarimg');
test.skipIf(!available)('payment QR decodes to the exact wallet URI', async () => {
  const address = '75a4WYbeKsdGjdFHqxpgNMSi3oqb1z9yx9m6qvNt3ZbTBpoFnD7EqicUZtCVsQoNPKXF5cMcTLJaTCkYiZVzddby9zc7bFV';
  const uri = makePaymentURI({address,amount:'0.075',recipientName:'Onur Stirner',description:'Donation',networkType:'stagenet'});
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-qr-'));
  try {
    const svg = join(directory, 'payment.svg');
    const png = join(directory, 'payment.png');
    await Bun.write(svg, qrSvg(uri,{ec:'H',moduleColor:'#000000',finderColor:'#000000',quietZone:4,scale:5}));
    expect(Bun.spawnSync(['rsvg-convert','--background-color=white','--width=244','-o',png,svg]).exitCode).toBe(0);
    const decoded = Bun.spawnSync(['zbarimg','--quiet','--raw',png]);
    expect(decoded.exitCode).toBe(0);
    expect(decoded.stdout.toString().trim()).toBe(uri);
  } finally { await rm(directory,{recursive:true,force:true}); }
});

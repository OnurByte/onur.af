const PICOS_PER_XMR = 1_000_000_000_000n;

function parseAmount(value: string): bigint {
  if (typeof value !== 'string' || !/^\d+(?:\.\d{1,12})?$/.test(value)) {
    throw new Error(
      'amount must be a decimal string with at most 12 fractional digits',
    );
  }

  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole!) * PICOS_PER_XMR + BigInt(fraction.padEnd(12, '0'));
}

export function parseXmrAmount(value: string): bigint {
  const piconero = parseAmount(value);
  if (piconero <= 0n || piconero > 100n * PICOS_PER_XMR) {
    throw new Error('amount must be greater than 0 and no more than 100 XMR');
  }
  return piconero;
}

export function parseXmrAmountOrZero(value: string): bigint {
  return parseAmount(value);
}

export function formatXmrAmount(piconero: bigint): string {
  if (piconero < 0n) throw new Error('amount cannot be negative');
  const whole = piconero / PICOS_PER_XMR;
  const fraction = (piconero % PICOS_PER_XMR)
    .toString()
    .padStart(12, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

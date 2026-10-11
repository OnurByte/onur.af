declare module 'xmr-pay/core' {
  export function makePaymentURI(options: {
    address: string;
    amount?: string;
    recipientName?: string;
    description?: string;
    networkType?: 'stagenet' | 'mainnet' | 'testnet';
  }): string;
  export function qrSvg(text: string, options?: {
    ec?: 'L' | 'M' | 'Q' | 'H';
    moduleColor?: string;
    finderColor?: string;
    scale?: number;
    quietZone?: number;
  }): string;
}

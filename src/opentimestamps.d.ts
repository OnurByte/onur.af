declare module 'opentimestamps' {
  interface Attestation {
    height?: number;
    uri?: string;
  }
  interface Timestamp {
    allAttestations(): Map<number[], Attestation>;
    attestations: Attestation[];
  }
  interface Detached {
    fileDigest(): number[];
    fileHashOp: { _HASHLIB_NAME(): string };
    timestamp: Timestamp;
    serializeToBytes(): number[];
  }
  const ots: {
    DetachedTimestampFile: {
      fromBytes(op: unknown, bytes: Uint8Array): Detached;
      deserialize(bytes: Uint8Array): Detached;
    };
    Ops: { OpSHA256: new () => unknown };
    Notary: {
      PendingAttestation: new (uri: string) => Attestation;
      BitcoinBlockHeaderAttestation: new (height: number) => Attestation;
    };
    stamp(
      detached: Detached,
      options?: { calendars?: string[]; m?: number },
    ): Promise<unknown>;
    upgrade(detached: Detached): Promise<boolean>;
    verifyTimestamp(
      timestamp: Timestamp,
      options: { ignoreBitcoinNode: boolean; timeout: number },
    ): Promise<{ bitcoin?: { height: number; timestamp: number } }>;
  };
  export default ots;
}

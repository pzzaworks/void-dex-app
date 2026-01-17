declare module 'snarkjs' {
  export const groth16: {
    fullProve: (
      input: Record<string, unknown>,
      wasmFile: string | Uint8Array,
      zkeyFile: string | Uint8Array,
    ) => Promise<{ proof: unknown; publicSignals: unknown }>;
    verify: (vKey: unknown, publicSignals: unknown, proof: unknown) => Promise<boolean>;
  };
}

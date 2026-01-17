// VoidDex Router addresses per chain
export const VOIDDEX_ROUTER: Record<number, { router: string; adapter: string }> = {
  11155111: {
    // Sepolia Testnet - Deployed 2026-01-02 with forceApprove fix in Router + Adapter
    router: '0x5A175fFF5B27a1f98b29c6EbB0f1Aac0181fF456',
    adapter: '0x46d768aA13A86d746611676035287a0E1a0e15e8',
  },
};

/**
 * Get VoidDex router address for a chain
 */
export function getVoidDexRouterAddress(chainId: number): string | null {
  return VOIDDEX_ROUTER[chainId]?.router || null;
}

/**
 * Get VoidDex adapter address for a chain
 */
export function getVoidDexAdapterAddress(chainId: number): string | null {
  return VOIDDEX_ROUTER[chainId]?.adapter || null;
}

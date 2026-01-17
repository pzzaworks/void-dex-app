/**
 * Public RPC Configuration with Fallback Support
 * No API keys needed - uses free public endpoints
 */

// Chain IDs
export const CHAIN_IDS = {
  ETHEREUM: 1,
  POLYGON: 137,
  ARBITRUM: 42161,
  BSC: 56,
  SEPOLIA: 11155111,
} as const;

// Multiple public RPCs per chain (ordered by reliability)
// Note: drpc.org removed - frequently returns 500 errors and breaks fallback quorum
export const PUBLIC_RPCS: Record<number, string[]> = {
  // Ethereum Mainnet
  [CHAIN_IDS.ETHEREUM]: [
    'https://eth.llamarpc.com',
    'https://ethereum.publicnode.com',
    'https://1rpc.io/eth',
  ],
  // Polygon
  [CHAIN_IDS.POLYGON]: [
    'https://polygon-bor-rpc.publicnode.com',
    'https://1rpc.io/matic',
  ],
  // Arbitrum
  [CHAIN_IDS.ARBITRUM]: [
    'https://arbitrum-one.publicnode.com',
  ],
  // BSC
  [CHAIN_IDS.BSC]: [
    'https://bsc-dataseed.binance.org',
    'https://bsc-rpc.publicnode.com',
    'https://bsc-dataseed1.defibit.io',
  ],
  // Sepolia Testnet
  // IMPORTANT: Only use CORS-enabled RPCs that work from browser
  // rpc.sepolia.org and blastapi.io have CORS issues - removed
  // publicnode.com has aggressive rate limiting - moved down in priority
  [CHAIN_IDS.SEPOLIA]: [
    'https://1rpc.io/sepolia', // Best rate limits, CORS enabled
    'https://sepolia.gateway.tenderly.co', // Good rate limits
    'https://ethereum-sepolia-rpc.publicnode.com', // Rate limited but reliable
  ],
};

// Track failed RPCs per chain (reset after success)
const failedRpcs: Record<number, Set<string>> = {};

// Track last successful RPC per chain
const lastSuccessfulRpc: Record<number, string> = {};

/**
 * Get the best RPC URL for a chain
 * Returns last successful one first, then tries others
 */
export function getRpcUrl(chainId: number): string {
  const rpcs = PUBLIC_RPCS[chainId];
  if (!rpcs || rpcs.length === 0) {
    throw new Error(`No RPC URLs configured for chain ${chainId}`);
  }

  // If we have a last successful RPC and it's not failed, use it
  const lastSuccess = lastSuccessfulRpc[chainId];
  if (lastSuccess && !failedRpcs[chainId]?.has(lastSuccess)) {
    return lastSuccess;
  }

  // Find first non-failed RPC
  const failed = failedRpcs[chainId] || new Set();
  for (const rpc of rpcs) {
    if (!failed.has(rpc)) {
      return rpc;
    }
  }

  // All failed? Reset and try first one again
  failedRpcs[chainId] = new Set();
  return rpcs[0];
}

/**
 * Get all RPC URLs for a chain (for wagmi fallback)
 */
export function getAllRpcUrls(chainId: number): string[] {
  return PUBLIC_RPCS[chainId] || [];
}

/**
 * Mark an RPC as failed - will try next one
 */
export function markRpcFailed(chainId: number, rpcUrl: string): void {
  if (!failedRpcs[chainId]) {
    failedRpcs[chainId] = new Set();
  }
  failedRpcs[chainId].add(rpcUrl);
  console.warn(`[RPC] Marked as failed: ${rpcUrl} for chain ${chainId}`);
}

/**
 * Mark an RPC as successful - will prefer it next time
 */
export function markRpcSuccess(chainId: number, rpcUrl: string): void {
  lastSuccessfulRpc[chainId] = rpcUrl;
  // Clear from failed list if it was there
  failedRpcs[chainId]?.delete(rpcUrl);
}

/**
 * Reset failed RPCs for a chain
 */
export function resetFailedRpcs(chainId: number): void {
  failedRpcs[chainId] = new Set();
}

/**
 * Execute a function with RPC fallback
 * Automatically tries next RPC if one fails
 */
export async function withRpcFallback<T>(
  chainId: number,
  fn: (rpcUrl: string) => Promise<T>,
): Promise<T> {
  const rpcs = PUBLIC_RPCS[chainId];
  if (!rpcs || rpcs.length === 0) {
    throw new Error(`No RPC URLs configured for chain ${chainId}`);
  }

  // Start with best RPC
  const startRpc = getRpcUrl(chainId);
  const startIndex = rpcs.indexOf(startRpc);
  const orderedRpcs = [
    ...rpcs.slice(startIndex),
    ...rpcs.slice(0, startIndex),
  ];

  let lastError: Error | null = null;

  for (const rpc of orderedRpcs) {
    try {
      const result = await fn(rpc);
      markRpcSuccess(chainId, rpc);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      markRpcFailed(chainId, rpc);
      console.warn(`[RPC] Failed ${rpc}: ${lastError.message}, trying next...`);
    }
  }

  // All RPCs failed
  resetFailedRpcs(chainId); // Reset for next attempt
  throw new Error(`All RPCs failed for chain ${chainId}: ${lastError?.message}`);
}

/**
 * Create an ethers provider with the current best RPC
 */
export async function createProvider(chainId: number) {
  const { ethers } = await import('ethers');
  const rpcUrl = getRpcUrl(chainId);
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Create an ethers provider with fallback support
 * Uses sequential fallback - tries each RPC in order until one succeeds
 */
export async function createFallbackProvider(chainId: number) {
  const { ethers } = await import('ethers');
  const rpcs = PUBLIC_RPCS[chainId];

  if (!rpcs || rpcs.length === 0) {
    throw new Error(`No RPC URLs configured for chain ${chainId}`);
  }

  // Create FallbackProvider with quorum=1 (only need 1 provider to succeed)
  // This ensures it tries each provider sequentially instead of requiring consensus
  const providers = rpcs.map((url, index) => ({
    provider: new ethers.JsonRpcProvider(url, chainId, {
      staticNetwork: true, // Prevents extra network detection calls
    }),
    priority: index + 1, // Lower priority = tried first
    stallTimeout: 1000, // 1s timeout before trying next
    weight: 1,
  }));

  // quorum=1 means only 1 provider needs to respond successfully
  return new ethers.FallbackProvider(providers, chainId, { quorum: 1 });
}

/**
 * Create a simple provider that tries each RPC sequentially
 * More reliable for single operations like gas estimation
 */
export async function createSequentialProvider(chainId: number) {
  const { ethers } = await import('ethers');
  const rpcs = PUBLIC_RPCS[chainId];

  if (!rpcs || rpcs.length === 0) {
    throw new Error(`No RPC URLs configured for chain ${chainId}`);
  }

  // Get the best RPC (tracks success/failure)
  const rpcUrl = getRpcUrl(chainId);

  const provider = new ethers.JsonRpcProvider(rpcUrl, chainId, {
    staticNetwork: true,
  });

  // Wrap provider methods to auto-retry on failure
  provider.send = async (method: string, params: unknown[]) => {
    const orderedRpcs = [rpcUrl, ...rpcs.filter(r => r !== rpcUrl)];
    let lastError: Error | null = null;

    for (const rpc of orderedRpcs) {
      try {
        // Create a temporary provider for this RPC
        const tempProvider = new ethers.JsonRpcProvider(rpc, chainId, { staticNetwork: true });
        const result = await tempProvider.send(method, params);
        markRpcSuccess(chainId, rpc);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        markRpcFailed(chainId, rpc);
        console.warn(`[RPC] ${method} failed on ${rpc.slice(0, 30)}...: ${lastError.message}`);
      }
    }

    throw lastError || new Error(`All RPCs failed for ${method}`);
  };

  return provider;
}

// Export for wagmi config
export const RPC_URLS: Record<number, string> = {
  [CHAIN_IDS.ETHEREUM]: PUBLIC_RPCS[CHAIN_IDS.ETHEREUM][0],
  [CHAIN_IDS.POLYGON]: PUBLIC_RPCS[CHAIN_IDS.POLYGON][0],
  [CHAIN_IDS.ARBITRUM]: PUBLIC_RPCS[CHAIN_IDS.ARBITRUM][0],
  [CHAIN_IDS.BSC]: PUBLIC_RPCS[CHAIN_IDS.BSC][0],
  [CHAIN_IDS.SEPOLIA]: PUBLIC_RPCS[CHAIN_IDS.SEPOLIA][0],
};

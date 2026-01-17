import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  walletConnectWallet,
  rainbowWallet,
  trustWallet,
  ledgerWallet,
  braveWallet,
  argentWallet,
  rabbyWallet,
  safeWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { mainnet, polygon, arbitrum, bsc, sepolia } from 'wagmi/chains';
import { PUBLIC_RPCS, CHAIN_IDS } from './rpc';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo';

// Custom wallet list without Coinbase (privacy-focused, no analytics)
const connectors = connectorsForWallets(
  [
    {
      groupName: 'Popular',
      wallets: [
        metaMaskWallet,
        walletConnectWallet,
        rabbyWallet,
        rainbowWallet,
        trustWallet,
        braveWallet,
      ],
    },
    {
      groupName: 'More',
      wallets: [argentWallet, ledgerWallet, safeWallet, injectedWallet],
    },
  ],
  {
    appName: 'VoidDex',
    projectId,
  },
);

// All supported chains - enabled/disabled is controlled via API settings
// NetworkSelector will filter based on API response
// IMPORTANT: First chain is the default - Sepolia first since it's the only enabled network
const chains = [sepolia, mainnet, polygon, arbitrum, bsc] as const;

// Simple transport - one RPC per chain
// Fallback logic is handled in our custom providers (see rpc.ts)
// This reduces unnecessary connections on app startup
// IMPORTANT: Use batch configuration to reduce 429 rate limit errors
function createSimpleTransport(chainId: number) {
  const rpcs = PUBLIC_RPCS[chainId];
  if (!rpcs || rpcs.length === 0) {
    return http(); // Default to public RPC
  }
  // Use first (most reliable) RPC with batching to reduce rate limit errors
  return http(rpcs[0], {
    timeout: 20000, // 20 second timeout
    retryCount: 3,
    retryDelay: 2000, // 2 second delay between retries
    batch: {
      batchSize: 50, // Batch up to 50 calls together
      wait: 100, // Wait 100ms to batch calls together
    },
  });
}

export const config = createConfig({
  connectors,
  chains,
  transports: {
    [mainnet.id]: createSimpleTransport(CHAIN_IDS.ETHEREUM),
    [polygon.id]: createSimpleTransport(CHAIN_IDS.POLYGON),
    [arbitrum.id]: createSimpleTransport(CHAIN_IDS.ARBITRUM),
    [bsc.id]: createSimpleTransport(CHAIN_IDS.BSC),
    [sepolia.id]: createSimpleTransport(CHAIN_IDS.SEPOLIA),
  },
  ssr: true,
  // IMPORTANT: Reduce polling to avoid 429 rate limit errors on public RPCs
  pollingInterval: 30_000, // Poll every 30 seconds instead of default 4 seconds
});

// Re-export RPC utilities for use in other parts of the app
export { PUBLIC_RPCS, CHAIN_IDS, getRpcUrl, withRpcFallback } from './rpc';

// Legacy export for backward compatibility
export const RPC_URLS = {
  [mainnet.id]: PUBLIC_RPCS[CHAIN_IDS.ETHEREUM][0],
  [polygon.id]: PUBLIC_RPCS[CHAIN_IDS.POLYGON][0],
  [arbitrum.id]: PUBLIC_RPCS[CHAIN_IDS.ARBITRUM][0],
  [bsc.id]: PUBLIC_RPCS[CHAIN_IDS.BSC][0],
  [sepolia.id]: PUBLIC_RPCS[CHAIN_IDS.SEPOLIA][0],
} as const;

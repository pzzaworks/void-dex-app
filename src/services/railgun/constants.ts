// RAILGUN Network Constants
// Local definitions to avoid importing from @railgun-community/shared-models during SSR

// Network name string literals (matches @railgun-community/shared-models NetworkName enum)
export const NetworkName = {
  Ethereum: 'Ethereum',
  Polygon: 'Polygon',
  Arbitrum: 'Arbitrum',
  BNBChain: 'BNB_Chain',
  EthereumSepolia: 'Ethereum_Sepolia',
  PolygonAmoy: 'Polygon_Amoy',
  Hardhat: 'Hardhat',
  EthereumGoerli_DEPRECATED: 'Ethereum_Goerli',
  EthereumRopsten_DEPRECATED: 'Ethereum_Ropsten',
  PolygonMumbai_DEPRECATED: 'Polygon_Mumbai',
  ArbitrumGoerli_DEPRECATED: 'Arbitrum_Goerli',
} as const;

export type NetworkNameType = (typeof NetworkName)[keyof typeof NetworkName];

// Supported networks for VoidDEX (Mainnet + Testnet)
export const SUPPORTED_NETWORKS: NetworkNameType[] = [
  NetworkName.Ethereum,
  NetworkName.Polygon,
  NetworkName.Arbitrum,
  NetworkName.BNBChain,
  NetworkName.EthereumSepolia, // Testnet
];

// Chain ID to NetworkName mapping
export const CHAIN_TO_NETWORK: Record<number, NetworkNameType> = {
  1: NetworkName.Ethereum,
  137: NetworkName.Polygon,
  42161: NetworkName.Arbitrum,
  56: NetworkName.BNBChain,
  11155111: NetworkName.EthereumSepolia, // Sepolia testnet
};

// NetworkName to Chain ID mapping
export const NETWORK_TO_CHAIN: Record<string, number> = {
  [NetworkName.Ethereum]: 1,
  [NetworkName.Polygon]: 137,
  [NetworkName.Arbitrum]: 42161,
  [NetworkName.BNBChain]: 56,
  [NetworkName.EthereumSepolia]: 11155111,
  [NetworkName.PolygonAmoy]: 80002,
  [NetworkName.Hardhat]: 31337,
  [NetworkName.EthereumGoerli_DEPRECATED]: 5,
  [NetworkName.EthereumRopsten_DEPRECATED]: 3,
  [NetworkName.PolygonMumbai_DEPRECATED]: 80001,
  [NetworkName.ArbitrumGoerli_DEPRECATED]: 421613,
};

// Note: RPC providers are now sourced from Viem chains (via Wagmi)
// See services/railgun/init.ts for RPC configuration

// Deployment blocks for each network (for scan optimization)
export const DEPLOYMENT_BLOCKS: Record<string, number> = {
  [NetworkName.Ethereum]: 15725000,
  [NetworkName.Polygon]: 33831000,
  [NetworkName.Arbitrum]: 28000000,
  [NetworkName.BNBChain]: 22000000,
  [NetworkName.EthereumSepolia]: 4000000,
  [NetworkName.PolygonAmoy]: 0,
  [NetworkName.Hardhat]: 0,
};

// POI (Proof of Innocence) node URLs
// Note: RAILGUN SDK doesn't provide default URLs - these are community-managed
// Default community POI aggregator nodes (production-ready):
// - https://ppoi-agg.horsewithsixlegs.xyz (Primary)
//
// For additional production nodes or custom configuration:
// 1. Join RAILGUN builders community: https://t.me/railgun_privacy
// 2. Request production POI aggregator node URLs
// 3. Add to .env.local: NEXT_PUBLIC_POI_NODE_URLS=https://node1.com,https://node2.com
//
// Or deploy your own node: https://github.com/Railgun-Community/private-proof-of-innocence
export const POI_NODE_URLS =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_POI_NODE_URLS
    ? process.env.NEXT_PUBLIC_POI_NODE_URLS.split(',').map((url) => url.trim())
    : [
        'https://ppoi-agg.horsewithsixlegs.xyz', // Primary community node
        // Add backup nodes here or via environment variable
      ];

// POI node URLs for testnet (Sepolia)
// Sepolia uses a different POI aggregator that supports testnet
export const SEPOLIA_POI_NODE_URLS =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SEPOLIA_POI_NODE_URLS
    ? process.env.NEXT_PUBLIC_SEPOLIA_POI_NODE_URLS.split(',').map((url) => url.trim())
    : [
        'https://ppoi-agg.horsewithsixlegs.xyz', // Same aggregator supports testnet
      ];

// Get POI node URLs based on network
export function getPOINodeUrls(network: NetworkNameType): string[] {
  if (network === NetworkName.EthereumSepolia || network === NetworkName.PolygonAmoy) {
    return SEPOLIA_POI_NODE_URLS;
  }
  return POI_NODE_URLS;
}

// Artifact storage paths
export const ARTIFACT_STORE_PATH = 'railgun-artifacts';

// Sepolia uses OLD artifacts (different from mainnet SDK)
// This is because Sepolia contract was deployed with older verification keys
export const SEPOLIA_ARTIFACT_IPFS_HASH = 'QmeBrG7pii1qTqsn7rusvDiqXopHPjCT9gR4PsmW7wXqZq';
export const SEPOLIA_IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

// Mainnet artifact IPFS hash (v2.1)
export const MAINNET_ARTIFACT_IPFS_HASH = 'QmS1L1NjFM2R7KXVSYEAGwSt8PYmkWbhCSDvqNsmrKhKW5';

// POI (Proof of Innocence) artifacts IPFS hash - DIFFERENT from main artifacts
// This is the official POI artifacts hash used by the RAILGUN SDK
export const POI_ARTIFACT_IPFS_HASH = 'QmZrP9zaZw2LwErT2yA6VpMWm65UdToQiKj4DtStVsUJHr';

// RAILGUN's official IPFS gateway (more reliable than public gateways)
export const RAILGUN_IPFS_GATEWAY = 'https://ipfs-lb.com/ipfs';

// Fast IPFS gateways (ordered by speed)
export const IPFS_GATEWAYS = [
  'https://ipfs-lb.com/ipfs', // RAILGUN's official gateway - try first
  'https://cloudflare-ipfs.com/ipfs',
  'https://ipfs.io/ipfs',
  'https://gateway.pinata.cloud/ipfs',
  'https://dweb.link/ipfs',
];

// Circuit variants that need artifacts
// NOTE: SDK uses raw numbers without leading zeros (e.g., "1x2", not "01x02")
export const CIRCUIT_VARIANTS = ['1x2', '2x2', '2x3', '3x1', '3x2', '3x3', '8x2'] as const;

// Wallet source identifier (max 16 chars, lowercase)
export const WALLET_SOURCE = 'voiddex';

// Display names for networks (user-friendly names for UI)
export const NETWORK_DISPLAY_NAMES: Record<string, string> = {
  [NetworkName.Ethereum]: 'Ethereum',
  [NetworkName.Polygon]: 'Polygon',
  [NetworkName.Arbitrum]: 'Arbitrum',
  [NetworkName.BNBChain]: 'BNB Chain',
  [NetworkName.EthereumSepolia]: 'Sepolia',
  [NetworkName.PolygonAmoy]: 'Polygon Amoy',
  [NetworkName.Hardhat]: 'Hardhat',
};

// Get display name for a network
export function getNetworkDisplayName(network: NetworkNameType | string | null): string {
  if (!network) return '';
  return NETWORK_DISPLAY_NAMES[network] || network;
}

// Get network config for a chain ID
export function getNetworkForChain(chainId: number): NetworkNameType | null {
  return CHAIN_TO_NETWORK[chainId] || null;
}

// Get deployment block for a network
export function getDeploymentBlock(network: NetworkNameType): number {
  return DEPLOYMENT_BLOCKS[network] || 0;
}

// Contract addresses are fetched dynamically from SDK
// These are async functions that import from @railgun-community/shared-models

// Cache for contract addresses (populated on first access)
let proxyAddressCache: Record<string, string> = {};
let relayAdaptAddressCache: Record<string, string> = {};
let cacheInitialized = false;

/**
 * Initialize contract address cache from SDK
 * Must be called after SDK is available (client-side only)
 */
async function initAddressCache(): Promise<void> {
  if (cacheInitialized) return;

  try {
    const { RailgunProxyContract, RelayAdaptContract } =
      await import('@railgun-community/shared-models');
    proxyAddressCache = RailgunProxyContract as Record<string, string>;
    relayAdaptAddressCache = RelayAdaptContract as Record<string, string>;
    cacheInitialized = true;
  } catch (err) {
    console.warn('[RAILGUN] Failed to load contract addresses from SDK:', err);
  }
}

/**
 * Get RAILGUN Proxy contract address for a network
 * Uses SDK's official addresses
 */
export async function getRailgunProxyAddress(network: NetworkNameType): Promise<`0x${string}`> {
  await initAddressCache();
  const address = proxyAddressCache[network];
  if (!address) {
    throw new Error(`No RAILGUN proxy address found for network: ${network}`);
  }
  return address as `0x${string}`;
}

/**
 * Get RAILGUN Relay Adapt contract address for a network
 * Uses SDK's official addresses
 */
export async function getRailgunRelayAdaptAddress(
  network: NetworkNameType,
): Promise<`0x${string}`> {
  await initAddressCache();
  const address = relayAdaptAddressCache[network];
  if (!address) {
    throw new Error(`No RAILGUN relay adapt address found for network: ${network}`);
  }
  return address as `0x${string}`;
}

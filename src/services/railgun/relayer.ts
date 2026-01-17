import { NetworkNameType, NETWORK_TO_CHAIN, NetworkName } from './constants';

// Full broadcaster info returned from findBestBroadcaster
export interface BroadcasterInfo {
  railgunAddress: string;
  tokenAddress: string;
  feePerUnitGas: bigint;
  feesID: string;
}

// Testnet networks (use minimal fees)
const TESTNET_NETWORKS: NetworkNameType[] = [
  NetworkName.EthereumSepolia,
  NetworkName.PolygonAmoy,
  NetworkName.Hardhat,
];

/**
 * Check if a network is a testnet
 */
function isTestnetNetwork(network: NetworkNameType): boolean {
  return TESTNET_NETWORKS.includes(network);
}

// Track initialization state
let isWakuStarted = false;
let currentWakuChainId: number | null = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

// Persist state across HMR in development
if (typeof window !== 'undefined') {
  const globalWindow = window as any;
  if (globalWindow.__WAKU_BROADCASTER_STARTED__) {
    isWakuStarted = globalWindow.__WAKU_BROADCASTER_STARTED__;
    currentWakuChainId = globalWindow.__WAKU_BROADCASTER_CHAIN_ID__;
  }
}

// HTTP broadcaster data for testnet
let httpBroadcasterData: { railgunAddress: string; fees: Record<string, any> } | null = null;
let httpBroadcasterFetchedAt: number = 0;
const HTTP_BROADCASTER_CACHE_TTL = 60 * 1000; // 1 minute cache TTL

/**
 * Initialize broadcaster client
 * - Testnet: Uses HTTP API to self-hosted broadcaster
 * - Mainnet: Uses Waku P2P network
 */
export async function initializeWakuRelayer(network?: NetworkNameType): Promise<void> {
  // Only run in browser
  if (typeof window === 'undefined') {
    return;
  }

  // Get chain ID for the network (default to Ethereum mainnet if not specified)
  const chainId = network ? NETWORK_TO_CHAIN[network] : 1;
  const isTestnet = network ? isTestnetNetwork(network) : false;

  // For testnet, use HTTP API directly
  if (isTestnet) {
    await initializeHttpBroadcaster(chainId);
    return;
  }

  // For mainnet, use Waku P2P
  await initializeWakuBroadcaster(chainId);
}

/**
 * Initialize HTTP broadcaster for testnet
 */
async function initializeHttpBroadcaster(chainId: number, forceRefresh = false): Promise<void> {
  const cacheExpired = Date.now() - httpBroadcasterFetchedAt > HTTP_BROADCASTER_CACHE_TTL;

  if (httpBroadcasterData && currentWakuChainId === chainId && !cacheExpired && !forceRefresh) {
    return;
  }

  try {
    const response = await fetch('/api/broadcaster/fees', {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    httpBroadcasterData = await response.json();
    httpBroadcasterFetchedAt = Date.now();
    currentWakuChainId = chainId;
    isWakuStarted = true; // Mark as ready (HTTP mode)

    if (typeof window !== 'undefined') {
      (window as any).__WAKU_BROADCASTER_STARTED__ = true;
      (window as any).__WAKU_BROADCASTER_CHAIN_ID__ = chainId;
      (window as any).__HTTP_BROADCASTER_DATA__ = httpBroadcasterData;
    }
  } catch (err) {
    console.error('[RAILGUN] HTTP broadcaster connection failed:', err);
    httpBroadcasterData = null;
    httpBroadcasterFetchedAt = 0;
    isWakuStarted = false;

    if (typeof window !== 'undefined') {
      (window as any).__HTTP_BROADCASTER_DATA__ = null;
    }
  }
}

/**
 * Initialize Waku P2P broadcaster for mainnet
 */
async function initializeWakuBroadcaster(chainId: number): Promise<void> {
  // Return if already initialized for this chain
  if (isWakuStarted && currentWakuChainId === chainId && !httpBroadcasterData) {
    return;
  }

  // If initialized for different chain, switch chain
  if (isWakuStarted && currentWakuChainId !== chainId && !httpBroadcasterData) {
    try {
      const { WakuBroadcasterClient } = await import('@railgun-community/waku-broadcaster-client-web');
      await WakuBroadcasterClient.setChain({ type: 0, id: chainId });
      currentWakuChainId = chainId;
      if (typeof window !== 'undefined') {
        (window as any).__WAKU_BROADCASTER_CHAIN_ID__ = chainId;
      }
      return;
    } catch (err) {
      console.error('[RAILGUN] Failed to switch chain:', err);
    }
  }

  // Return existing promise if initialization in progress
  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;
  httpBroadcasterData = null; // Clear HTTP data when switching to Waku

  initPromise = (async () => {
    try {
      const { WakuBroadcasterClient } = await import('@railgun-community/waku-broadcaster-client-web');

      const chain = { type: 0, id: chainId };

      // Broadcaster options
      const broadcasterOptions = {
        peerDiscoveryTimeout: 60000, // 60 seconds for peer discovery
      };

      // Status callback (empty - no debug logging)
      const statusCallback = () => {};

      // Start Waku client
      await WakuBroadcasterClient.start(chain, broadcasterOptions, statusCallback);

      isWakuStarted = true;
      currentWakuChainId = chainId;

      if (typeof window !== 'undefined') {
        (window as any).__WAKU_BROADCASTER_STARTED__ = true;
        (window as any).__WAKU_BROADCASTER_CHAIN_ID__ = chainId;
      }
    } catch (err) {
      console.error('[RAILGUN] Waku broadcaster initialization failed:', err);
      isWakuStarted = false;
      currentWakuChainId = null;
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
}

/**
 * Find best broadcaster for a given token and network
 * Returns full broadcaster info for transaction submission
 */
export async function findBestBroadcaster(
  network: NetworkNameType,
  tokenAddress: string,
  useRelayAdapt: boolean = true,
): Promise<BroadcasterInfo | null> {
  const chainId = NETWORK_TO_CHAIN[network];
  if (!chainId) {
    console.warn('[RAILGUN] Unknown network for broadcaster');
    return null;
  }

  const isTestnet = isTestnetNetwork(network);

  // For testnet, always check cache freshness and refresh if needed
  if (isTestnet) {
    const cacheExpired = Date.now() - httpBroadcasterFetchedAt > HTTP_BROADCASTER_CACHE_TTL;
    if (!httpBroadcasterData || cacheExpired) {
      await initializeHttpBroadcaster(chainId, true);
    }
  } else if (!isWakuStarted) {
    // For mainnet, ensure Waku is initialized
    await initializeWakuRelayer(network);
  }

  // For testnet, use HTTP broadcaster data
  if (isTestnet && httpBroadcasterData) {
    return findBroadcasterFromHttpData(tokenAddress);
  }

  // For mainnet, use Waku P2P
  const chain = { type: 0, id: chainId };

  try {
    const { WakuBroadcasterClient } = await import('@railgun-community/waku-broadcaster-client-web');

    // Use SDK's findBestBroadcaster
    const selectedBroadcaster = WakuBroadcasterClient.findBestBroadcaster(
      chain,
      tokenAddress.toLowerCase(),
      useRelayAdapt,
    );

    if (selectedBroadcaster) {
      return {
        railgunAddress: selectedBroadcaster.railgunAddress,
        tokenAddress: selectedBroadcaster.tokenAddress,
        feePerUnitGas: BigInt(selectedBroadcaster.tokenFee.feePerUnitGas),
        feesID: selectedBroadcaster.tokenFee.feeCacheID,
      };
    }

    return null;
  } catch (err) {
    console.error('[RAILGUN] Error finding broadcaster via Waku:', err);
    return null;
  }
}

/**
 * Find broadcaster from HTTP data (for testnet)
 */
function findBroadcasterFromHttpData(tokenAddress: string): BroadcasterInfo | null {
  if (!httpBroadcasterData) {
    return null;
  }

  const normalizedToken = tokenAddress.toLowerCase();

  // Check for specific token fee
  const fee = httpBroadcasterData.fees?.[normalizedToken];
  if (fee) {
    return {
      railgunAddress: httpBroadcasterData.railgunAddress,
      tokenAddress: fee.tokenAddress || tokenAddress,
      feePerUnitGas: BigInt(fee.feePerUnitGas),
      feesID: fee.feesID,
    };
  }

  // Token not in broadcaster's fee list - cannot proceed safely
  return null;
}

/**
 * @deprecated Use findBestBroadcaster instead
 */
export async function findBestRelayer(
  network: NetworkNameType,
  tokenAddress: string,
  useRelayAdapt: boolean = false,
): Promise<{ relayerAddress: string; relayerFee: bigint } | null> {
  const broadcaster = await findBestBroadcaster(network, tokenAddress, useRelayAdapt);
  if (!broadcaster) return null;
  return {
    relayerAddress: broadcaster.railgunAddress,
    relayerFee: broadcaster.feePerUnitGas,
  };
}

/**
 * Check if broadcaster client is connected
 */
export function isBroadcasterConnected(): boolean {
  return isWakuStarted;
}

/**
 * Ensure broadcaster is initialized for network
 * Returns true if broadcaster is ready, false otherwise
 */
export async function ensureBroadcasterReady(network: NetworkNameType): Promise<boolean> {
  const chainId = NETWORK_TO_CHAIN[network];

  if (isWakuStarted && currentWakuChainId === chainId) {
    return true;
  }

  try {
    await initializeWakuRelayer(network);
    return isWakuStarted;
  } catch {
    return false;
  }
}

/**
 * Stop broadcaster client
 */
export async function stopWakuRelayer(): Promise<void> {
  if (!isWakuStarted) return;

  try {
    const { WakuBroadcasterClient } = await import('@railgun-community/waku-broadcaster-client-web');
    await WakuBroadcasterClient.stop();
  } catch (err) {
    console.error('[RAILGUN] Error stopping Waku client:', err);
  }

  isWakuStarted = false;
  currentWakuChainId = null;

  if (typeof window !== 'undefined') {
    (window as any).__WAKU_BROADCASTER_STARTED__ = false;
    (window as any).__WAKU_BROADCASTER_CHAIN_ID__ = null;
  }
}

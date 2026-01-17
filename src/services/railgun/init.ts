import { createDatabase } from './database';
import {
  NetworkNameType,
  WALLET_SOURCE,
  POI_NODE_URLS,
  NETWORK_TO_CHAIN,
  NetworkName,
  SEPOLIA_ARTIFACT_IPFS_HASH,
  SEPOLIA_IPFS_GATEWAY,
  MAINNET_ARTIFACT_IPFS_HASH,
  IPFS_GATEWAYS,
  POI_ARTIFACT_IPFS_HASH,
  RAILGUN_IPFS_GATEWAY,
} from './constants';
import { PUBLIC_RPCS } from '@/lib/rpc';

let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

// Track which networks have loaded providers
const loadedProviders = new Set<NetworkNameType>();
// Track loading promises to allow waiting on concurrent requests
const loadingPromises = new Map<NetworkNameType, Promise<boolean>>();

// Artifact storage reference (set during init)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let artifactStorageRef: any = null;

// Track current network for artifact storage (allows network-specific artifact paths)
let currentArtifactNetwork: NetworkNameType | null = null;

// Network-specific artifact prefixes
// Networks that need special artifacts (different from mainnet SDK) are listed here
// This allows any network to have custom artifacts without hardcoding
const NETWORK_ARTIFACT_PREFIXES: Partial<Record<NetworkNameType, string>> = {
  [NetworkName.EthereumSepolia]: 'sepolia-artifacts-v2.1',
  // Add more networks as needed:
  // [NetworkName.PolygonAmoy]: 'amoy-artifacts-v1',
};

// Default prefix for mainnet networks (used by SDK)
const DEFAULT_ARTIFACT_PREFIX = 'artifacts-v2.1';

/**
 * Get artifact prefix for a network
 * Returns network-specific prefix if defined, otherwise default
 */
function getArtifactPrefix(network: NetworkNameType | null): string {
  if (!network) return DEFAULT_ARTIFACT_PREFIX;
  return NETWORK_ARTIFACT_PREFIXES[network] || DEFAULT_ARTIFACT_PREFIX;
}

/**
 * Convert artifact path to network-specific path
 * e.g., "artifacts-v2.1/1x2/zkey" -> "sepolia-artifacts-v2.1/1x2/zkey" for Sepolia
 */
function getNetworkArtifactPath(path: string, network: NetworkNameType | null): string {
  const prefix = getArtifactPrefix(network);
  if (prefix !== DEFAULT_ARTIFACT_PREFIX && path.startsWith(`${DEFAULT_ARTIFACT_PREFIX}/`)) {
    return path.replace(`${DEFAULT_ARTIFACT_PREFIX}/`, `${prefix}/`);
  }
  return path;
}

// Network-specific artifact download configurations
// Each entry defines how to download artifacts for that network from IPFS
interface NetworkArtifactConfig {
  ipfsHash: string;
  ipfsGateway: string;
  variants: string[]; // Circuit variants in IPFS format (e.g., '1x2', '2x2')
  useBrotli: boolean; // Whether artifacts are brotli compressed
}

// POI circuit variants (Proof of Innocence)
// Only POI_3x3 (mini) and POI_13x13 (full) are valid according to SDK
// Storage path format: artifacts-v2.1/poi-nov-2-23/POI_{inputs}x{outputs}/
// IPFS path format: POI_{inputs}x{outputs}/ (different IPFS hash than main artifacts)
const POI_VARIANTS = ['POI_3x3', 'POI_13x13'] as const;

// Map POI variant to storage directory (SDK stores at this path)
const getPOIStorageDir = (variant: string) => `poi-nov-2-23/${variant}`;

// Map of alternate paths to primary paths for POI (SDK may request in different formats)
const POI_ALTERNATE_PATHS: Record<string, string> = {
  'poi-nov-2-23_3x3': 'poi-nov-2-23/POI_3x3',
  'poi-nov-2-23_13x13': 'poi-nov-2-23/POI_13x13',
};

const NETWORK_ARTIFACT_CONFIGS: Partial<Record<NetworkNameType, NetworkArtifactConfig>> = {
  [NetworkName.EthereumSepolia]: {
    ipfsHash: SEPOLIA_ARTIFACT_IPFS_HASH,
    ipfsGateway: SEPOLIA_IPFS_GATEWAY,
    // All circuit variants needed for various UTXO combinations
    // Format: {inputs}x{outputs} where inputs=nullifiers, outputs=commitments
    // 1x1 is needed for simple 1-in-1-out transactions
    variants: ['1x1', '1x2', '1x3', '2x2', '2x3', '3x1', '3x2', '3x3', '4x2', '5x2', '6x2', '7x2', '8x2'],
    useBrotli: true,
    // POI variants are downloaded separately - they may or may not exist on testnet IPFS
  },
  // Add more network configs as needed:
  // [NetworkName.PolygonAmoy]: {
  //   ipfsHash: 'Qm...',
  //   ipfsGateway: 'https://gateway.pinata.cloud/ipfs',
  //   variants: ['1x2', '2x2'],
  //   useBrotli: true,
  // },
};

// Log current memory usage (currently a no-op, can be enabled for debugging)
function logMemoryUsage(_label: string): void {
  // Memory logging disabled - uncomment to enable
  // if (typeof performance !== 'undefined' && 'memory' in performance) {
  //   const mem = (performance as any).memory;
  //   const usedMB = Math.round(mem.usedJSHeapSize / 1024 / 1024);
  //   const limitMB = Math.round(mem.jsHeapSizeLimit / 1024 / 1024);
  //   console.log(`[RAILGUN] ${_label}: ${usedMB}MB / ${limitMB}MB`);
  // }
}

// Persist initialization state across HMR in development
if (typeof window !== 'undefined') {
  const globalWindow = window as any;
  if (globalWindow.__RAILGUN_INITIALIZED__) {
    isInitialized = true;
  }
  if (globalWindow.__RAILGUN_INIT_PROMISE__) {
    initializationPromise = globalWindow.__RAILGUN_INIT_PROMISE__;
  }
}

// Callbacks for balance updates (used by SDK internally)
type BalanceCallback = (walletId: string, network: NetworkNameType) => void;
const balanceCallbacks: Set<BalanceCallback> = new Set();

export function onBalanceUpdate(callback: BalanceCallback): () => void {
  balanceCallbacks.add(callback);
  return () => {
    balanceCallbacks.delete(callback);
  };
}

// Callbacks for scan progress
type ScanCallback = (network: NetworkNameType, progress: number) => void;
const scanCallbacks: Set<ScanCallback> = new Set();

export function onScanProgress(callback: ScanCallback): () => void {
  scanCallbacks.add(callback);
  return () => scanCallbacks.delete(callback);
}

/**
 * Get all RPC URLs for a network
 */
function getRpcUrlsForNetwork(network: NetworkNameType): string[] {
  const chainId = NETWORK_TO_CHAIN[network];
  if (!chainId) return [];
  return PUBLIC_RPCS[chainId] || [];
}

/**
 * Create provider config for a network
 * IMPORTANT: Only use ONE RPC to avoid rate limit issues
 * Multiple RPCs cause parallel connections which triggers 429 errors
 */
function createProviderConfig(network: NetworkNameType) {
  const rpcUrls = getRpcUrlsForNetwork(network);
  const chainId = NETWORK_TO_CHAIN[network];

  if (rpcUrls.length === 0 || !chainId) {
    throw new Error(`No RPC configured for network: ${network}`);
  }

  // IMPORTANT: Only use the FIRST RPC to avoid 429 rate limit errors
  // Using multiple RPCs causes the FallbackProvider to make parallel requests
  // which overwhelms public RPC rate limits
  // The first RPC (1rpc.io) has better rate limits than publicnode.com
  const primaryRpc = rpcUrls[0];

  // RAILGUN requires total weight >= 2 for quorum
  // Use single provider with weight 2 to meet requirement
  const providers = [{
    provider: primaryRpc,
    priority: 1,
    weight: 2, // Weight >= 2 required for quorum
    maxLogsPerBatch: 3, // Low batch size to avoid rate limits
    stallTimeout: 10000, // 10s timeout - be patient with single RPC
  }];

  return {
    chainId,
    providers,
  };
}

/**
 * Download a file from IPFS with gateway fallback
 */
async function downloadFromIPFS(
  hash: string,
  path: string,
  timeout: number = 30000,
): Promise<ArrayBuffer | null> {
  for (const gateway of IPFS_GATEWAYS) {
    const url = `${gateway}/${hash}/${path}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: '*/*' },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const buffer = await response.arrayBuffer();
        return buffer;
      }
    } catch (err) {
      console.warn(`[RAILGUN] Failed to download from ${gateway}:`, err);
    }
  }
  return null;
}

/**
 * Pre-download circuit artifacts for faster proof generation
 * Downloads the most common circuits in background
 * Note: Networks with custom artifacts (like Sepolia) are handled by downloadNetworkArtifacts()
 */
async function predownloadArtifacts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storage: any, // LocalForage instance
  network: NetworkNameType,
  // NOTE: SDK uses raw numbers without leading zeros (e.g., "1x2", not "01x02")
  circuits: readonly string[] = ['1x2', '2x2'], // Most common circuits for unshield
): Promise<void> {
  // Skip networks that have custom artifact configs - they use downloadNetworkArtifacts()
  // which handles their specific artifact structure (brotli compression, different IPFS, etc.)
  if (NETWORK_ARTIFACT_CONFIGS[network]) {
    return;
  }

  const artifactVersion = 'artifacts-v2.1';


  for (const circuit of circuits) {
    const files = ['vkey.json', 'zkey', 'wasm'];

    for (const file of files) {
      const path = `${artifactVersion}/${circuit}/${file}`;

      // Check if already cached
      const existing = await storage.getItem(path);
      if (existing) {
        continue;
      }

      // Download from IPFS - mainnet artifacts
      const ipfsPath = `${circuit}/${file}`;
      const data = await downloadFromIPFS(
        MAINNET_ARTIFACT_IPFS_HASH,
        ipfsPath,
        file === 'zkey' ? 60000 : 30000,
      );

      if (data) {
        await storage.setItem(path, data);
      } else {
        console.warn(`[RAILGUN] Failed to pre-download ${path}`);
      }
    }
  }

}

/**
 * Initialize the RAILGUN Privacy Engine
 * This must be called before any wallet operations
 * Uses dynamic import to avoid SSR issues with WASM
 */
export async function initializeRailgun(): Promise<void> {
  // Only run on client
  if (typeof window === 'undefined') {
    throw new Error('RAILGUN can only be initialized in browser');
  }

  const globalWindow = window as any;

  // Check SDK's internal engine state first (most reliable)
  // This MUST be checked before anything else to avoid duplicate WASM instantiation
  try {
    const wallet = await import('@railgun-community/wallet');

    if (typeof wallet.hasEngine === 'function') {
      const engineExists = wallet.hasEngine();

      if (engineExists) {
        isInitialized = true;
        globalWindow.__RAILGUN_INITIALIZED__ = true;
        return;
      }
    } else {
      // hasEngine function not available in this SDK version
    }
  } catch {
    // Engine check failed, will attempt initialization
  }

  // Return immediately if already initialized (check both local and global state)
  if (isInitialized || globalWindow.__RAILGUN_INITIALIZED__) {
    isInitialized = true;
    return;
  }

  // Return existing promise if already initializing
  if (initializationPromise) {
    return initializationPromise;
  }

  if (globalWindow.__RAILGUN_INIT_PROMISE__) {
    initializationPromise = globalWindow.__RAILGUN_INIT_PROMISE__ as Promise<void>;
    return initializationPromise;
  }

  // Check memory before attempting WASM initialization
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    const mem = (performance as any).memory;
    const usedMB = Math.round(mem.usedJSHeapSize / 1024 / 1024);
    if (usedMB > 2000) {
      console.error(`[RAILGUN] Memory too high (${usedMB}MB) - page reload required`);
      throw new Error('Memory usage too high. Please close this tab and open a new one.');
    }
  }

  initializationPromise = (async () => {
    try {
      logMemoryUsage('Init start');

      // In development, HMR can cause WASM memory leaks
      // Check if WASM modules are already loaded (orphaned from previous HMR cycle)
      if (process.env.NODE_ENV === 'development') {
        const wasmModules = globalWindow.__RAILGUN_WASM_LOADED__ as boolean;
        if (wasmModules) {
          console.warn(
            '[RAILGUN] WASM was previously loaded but engine state lost (HMR). Reload required.',
          );
          throw new Error('Hot reload detected. Please close this tab and open a new one.');
        }
      }

      // Dynamic import of RAILGUN wallet SDK (avoids SSR WASM loading)
      const {
        startRailgunEngine,
        setOnBalanceUpdateCallback,
        setOnUTXOMerkletreeScanCallback,
        loadProvider: _loadProvider, // eslint-disable-line @typescript-eslint/no-unused-vars
        ArtifactStore,
      } = await import('@railgun-community/wallet');

      // 1. Create database
      const db = await createDatabase();

      // 2. Create artifact store using IndexedDB for ZK proof artifacts
      const localforage = (await import('localforage')).default;
      const artifactStorage = localforage.createInstance({
        name: 'railgun-artifacts',
      });
      artifactStorageRef = artifactStorage; // Save reference for pre-download

      // Artifact version tracking - only clear on breaking changes
      // Individual downloads check if files exist, so no need to clear everything
      const ARTIFACT_VERSION_KEY = 'artifact-version';
      const CURRENT_VERSION = 'v3-stable'; // Only change this on breaking artifact format changes
      const storedVersion = await artifactStorage.getItem(ARTIFACT_VERSION_KEY);
      if (storedVersion !== CURRENT_VERSION) {
        // Don't clear - let individual downloads handle their own caching
        await artifactStorage.setItem(ARTIFACT_VERSION_KEY, CURRENT_VERSION);
      }

      const artifactStore = new ArtifactStore(
        async (path: string): Promise<string | Buffer | null> => {
          // Try network-specific path first, then default path
          const networkPath = getNetworkArtifactPath(path, currentArtifactNetwork);
          let pathsToTry = networkPath !== path ? [networkPath, path] : [path];

          // For POI artifacts with underscore format, also try the primary slash format
          // e.g., poi-nov-2-23_3x3 -> poi-nov-2-23/POI_3x3
          const isPOI = path.includes('poi-nov-2-23');
          if (isPOI) {
            const additionalPaths: string[] = [];
            for (const [altPattern, primaryPattern] of Object.entries(POI_ALTERNATE_PATHS)) {
              if (path.includes(altPattern)) {
                // Add paths with the primary format
                const primaryPath = path.replace(altPattern, primaryPattern);
                const primaryNetworkPath = getNetworkArtifactPath(primaryPath, currentArtifactNetwork);
                if (!pathsToTry.includes(primaryNetworkPath)) {
                  additionalPaths.push(primaryNetworkPath);
                }
                if (!pathsToTry.includes(primaryPath)) {
                  additionalPaths.push(primaryPath);
                }
              }
            }
            pathsToTry = [...pathsToTry, ...additionalPaths];
          }

          const isVkey = path.includes('vkey');
          const isZkey = path.includes('zkey');
          const isWasm = path.includes('wasm');

          for (const tryPath of pathsToTry) {
            const data = await artifactStorage.getItem<string | ArrayBuffer>(tryPath);
            if (data) {
              // Validate vkey content before returning
              if (isVkey && typeof data === 'string') {
                try {
                  const parsed = JSON.parse(data);
                  // Skip vkeys with undefined curve (corrupted)
                  if (!parsed.curve) {
                    continue;
                  }
                } catch {
                  continue;
                }
              }

              // Convert ArrayBuffer back to Buffer if needed
              if (data instanceof ArrayBuffer) {
                return Buffer.from(data);
              }
              return data as string | Buffer;
            }
          }

          return null;
        },
        async (_dir: string, path: string, item: string | Uint8Array) => {
          // Store Uint8Array as ArrayBuffer for IndexedDB compatibility
          const toStore = item instanceof Uint8Array ? item.buffer : item;
          await artifactStorage.setItem(path, toStore);
        },
        async (path: string): Promise<boolean> => {
          // Check network-specific path first, then default path
          const networkPath = getNetworkArtifactPath(path, currentArtifactNetwork);
          const pathsToCheck = networkPath !== path ? [networkPath, path] : [path];

          for (const checkPath of pathsToCheck) {
            const exists = (await artifactStorage.getItem(checkPath)) != null;
            if (exists) {
              return true;
            }
          }
          return false;
        },
      );

      // 3. Start the RAILGUN engine
      // skipMerkletreeScans MUST be false - SDK requires it to load wallets
      // Rate limiting is mitigated by maxLogsPerBatch=100 in provider config
      await startRailgunEngine(
        WALLET_SOURCE,
        db,
        true, // shouldDebug - ENABLED to see POI proof errors
        artifactStore,
        false, // useNativeArtifacts (use WASM for browser)
        false, // skipMerkletreeScans - MUST be false for wallet loading
        POI_NODE_URLS,
        undefined, // customPOILists
        true, // verboseScanLogging - ENABLED to see POI errors
      );

      // Mark WASM as loaded (for HMR detection)
      globalWindow.__RAILGUN_WASM_LOADED__ = true;

      // 4. Set up Groth16 prover for ZK proof generation (required for unshield/transfer)
      try {
        const { getProver } = await import('@railgun-community/wallet');
        const snarkjs = await import('snarkjs');

        // Verify we have fullProve function (required for proper proof generation)
        if (!snarkjs.groth16?.fullProve) {
          throw new Error('snarkjs.groth16.fullProve not found - required for proof generation');
        }

        // @ts-expect-error - snarkjs types don't match exactly but it works
        getProver().setSnarkJSGroth16(snarkjs.groth16);
      } catch (err) {
        console.error('[RAILGUN] Failed to configure Groth16 prover:', err);
        throw new Error(
          `Groth16 prover configuration failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }

      // 5. Set up balance update callback (after engine started)
      setOnBalanceUpdateCallback((balancesEvent) => {
        // Notify all registered callbacks
        if (balanceCallbacks.size > 0) {
          const walletId = balancesEvent.railgunWalletID;
          const chainId = balancesEvent.chain?.id;

          // Find network for this chain
          const network = Object.entries(NETWORK_TO_CHAIN).find(([, id]) => id === chainId)?.[0] as
            | NetworkNameType
            | undefined;

          if (walletId && network) {
            balanceCallbacks.forEach((cb) => {
              cb(walletId, network);
            });
          }
        }
      });

      // 6. Set up merkletree scan callback (after engine started)
      setOnUTXOMerkletreeScanCallback((scanData) => {
        const { chain } = scanData;
        scanCallbacks.forEach((cb) => {
          const network = Object.entries(NETWORK_TO_CHAIN).find(
            ([, id]) => id === chain.id,
          )?.[0] as NetworkNameType | undefined;

          if (network) {
            cb(network, scanData.progress || 50);
          }
        });
      });

      isInitialized = true;

      // Persist state for HMR
      if (typeof window !== 'undefined') {
        (window as any).__RAILGUN_INITIALIZED__ = true;
        (window as any).__RAILGUN_INIT_PROMISE__ = initializationPromise;
      }
    } catch (error) {
      console.error('[RAILGUN] Initialization failed:', error);
      initializationPromise = null;
      isInitialized = false;
      throw error;
    }
  })();

  return initializationPromise;
}

/**
 * Check if RAILGUN is initialized
 */
export function isRailgunInitialized(): boolean {
  return isInitialized;
}

// Track which networks have had their artifacts downloaded
const networkArtifactsDownloaded = new Set<NetworkNameType>();

/**
 * Check if network artifacts are already cached in IndexedDB
 * Returns true if artifacts exist (no download needed), false otherwise
 * This is a quick check that doesn't download anything
 */
export async function hasNetworkArtifacts(network: NetworkNameType): Promise<boolean> {
  // Already verified in memory
  if (networkArtifactsDownloaded.has(network)) {
    return true;
  }

  try {
    const localforage = (await import('localforage')).default;
    const artifactStorage = localforage.createInstance({
      name: 'railgun-artifacts',
    });

    const prefix = getArtifactPrefix(network);

    // Check for actual artifact files (more reliable than cache marker)
    // Check for zkey file which is the largest and most important
    // NOTE: SDK uses raw numbers without leading zeros (e.g., "1x2", not "01x02")
    const testPath = `${prefix}/1x2/zkey`;
    const exists = await artifactStorage.getItem(testPath);

    if (exists) {
      networkArtifactsDownloaded.add(network);
      return true;
    }

    return false;
  } catch (err) {
    console.warn('[RAILGUN] Error checking artifact cache:', err);
    return false;
  }
}

/**
 * Download network-specific artifacts from IPFS
 * Used for networks that need different artifacts than mainnet SDK provides
 */
async function downloadNetworkArtifacts(network: NetworkNameType): Promise<void> {
  // NOTE: We don't check networkArtifactsDownloaded here because the variant list may change
  // (e.g., after code updates with HMR). Instead, we always check individual variants.

  // Initialize artifact storage early so it's available for POI download
  const localforage = (await import('localforage')).default;
  const artifactStorage = localforage.createInstance({
    name: 'railgun-artifacts',
  });

  // Check if this network needs custom artifacts
  const config = NETWORK_ARTIFACT_CONFIGS[network];
  if (!config) {
    // Still download POI artifacts even if no custom circuit config
    await downloadPOIArtifacts(network, artifactStorage);
    return;
  }

  const prefix = getArtifactPrefix(network);

  // Helper to convert variant to SDK path format (1x2 -> prefix/1x2)
  // NOTE: SDK uses raw numbers without leading zeros (e.g., "1x2", not "01x02")
  const toSdkPath = (v: string) => {
    return `${prefix}/${v}`;
  };

  // NOTE: We don't use a global cache marker anymore because the variant list may change.
  // Instead, we check each variant individually and only download if missing.

  try {
    // Import brotli-wasm for decompression if needed
    let brotli: { decompress: (data: Uint8Array) => Uint8Array } | null = null;
    if (config.useBrotli) {
      const brotliModule = await import('brotli-wasm');
      brotli = await brotliModule.default;
    }

    // Download artifacts for each variant
    for (const variant of config.variants) {
      const variantPath = toSdkPath(variant);

      // Check if this variant is already cached (check both zkey AND vkey)
      const zkeyExists = await artifactStorage.getItem(`${variantPath}/zkey`);
      const vkeyExists = await artifactStorage.getItem(`${variantPath}/vkey.json`);
      if (zkeyExists && vkeyExists) {
        continue;
      }

      // Download vkey.json (not compressed)
      const vkeyUrl = `${config.ipfsGateway}/${config.ipfsHash}/${variant}/vkey.json`;
      const vkeyResponse = await fetch(vkeyUrl);
      if (!vkeyResponse.ok) {
        console.warn(`[RAILGUN] Failed to fetch vkey for ${variant}: ${vkeyResponse.status}`);
        continue;
      }
      const vkeyData = await vkeyResponse.text();
      await artifactStorage.setItem(`${variantPath}/vkey.json`, vkeyData);

      // Download zkey (may be brotli compressed)
      const zkeyUrl = config.useBrotli
        ? `${config.ipfsGateway}/${config.ipfsHash}/${variant}/zkey.br`
        : `${config.ipfsGateway}/${config.ipfsHash}/${variant}/zkey`;
      const zkeyResponse = await fetch(zkeyUrl);
      if (!zkeyResponse.ok) {
        console.warn(`[RAILGUN] Failed to fetch zkey for ${variant}: ${zkeyResponse.status}`);
        continue;
      }

      if (config.useBrotli && brotli) {
        const zkeyCompressed = new Uint8Array(await zkeyResponse.arrayBuffer());
        const zkeyDecompressed = brotli.decompress(zkeyCompressed);
        await artifactStorage.setItem(`${variantPath}/zkey`, zkeyDecompressed.buffer);
      } else {
        const zkeyData = await zkeyResponse.arrayBuffer();
        await artifactStorage.setItem(`${variantPath}/zkey`, zkeyData);
      }

      // Download wasm (may be brotli compressed)
      const wasmUrl = config.useBrotli
        ? `${config.ipfsGateway}/${config.ipfsHash}/prover/snarkjs/${variant}.wasm.br`
        : `${config.ipfsGateway}/${config.ipfsHash}/prover/snarkjs/${variant}.wasm`;
      const wasmResponse = await fetch(wasmUrl);
      if (!wasmResponse.ok) {
        console.warn(`[RAILGUN] Failed to fetch wasm for ${variant}: ${wasmResponse.status}`);
        continue;
      }

      if (config.useBrotli && brotli) {
        const wasmCompressed = new Uint8Array(await wasmResponse.arrayBuffer());
        const wasmDecompressed = brotli.decompress(wasmCompressed);
        await artifactStorage.setItem(`${variantPath}/wasm`, wasmDecompressed.buffer);
      } else {
        const wasmData = await wasmResponse.arrayBuffer();
        await artifactStorage.setItem(`${variantPath}/wasm`, wasmData);
      }
    }

    // Mark as downloaded in memory (per-session check)
    networkArtifactsDownloaded.add(network);

  } catch (err) {
    console.error(`[RAILGUN] Failed to download ${network} artifacts:`, err);
    // Don't throw - let the SDK try to download its own artifacts
    // They will fail verification but at least the app won't crash
  }

  // Always try to download POI artifacts (outside try block to ensure it runs)
  // POI artifacts are network-agnostic but need to be stored at network-specific paths
  try {
    await downloadPOIArtifacts(network, artifactStorage);
  } catch (poiErr) {
    console.error(`[RAILGUN] Failed to download POI artifacts:`, poiErr);
  }
}

/**
 * Download POI (Proof of Innocence) artifacts from RAILGUN's POI IPFS
 * POI uses a DIFFERENT IPFS hash than main circuit artifacts
 * POI circuits are network-agnostic but stored with network-specific paths
 */
async function downloadPOIArtifacts(
  network: NetworkNameType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  artifactStorage: any
): Promise<void> {
  const prefix = getArtifactPrefix(network);

  // First, clear any corrupted POI vkeys that might interfere
  for (const poiVariant of POI_VARIANTS) {
    const storagePath = `${prefix}/${getPOIStorageDir(poiVariant)}/vkey.json`;
    const existingVkey = await artifactStorage.getItem(storagePath);
    if (existingVkey) {
      try {
        const parsed = JSON.parse(existingVkey as string);
        if (!parsed.curve) {
          await artifactStorage.removeItem(storagePath);
        }
      } catch {
        await artifactStorage.removeItem(storagePath);
      }
    }
  }

  // Import brotli-wasm for decompression
  let brotli: { decompress: (data: Uint8Array) => Uint8Array } | null = null;
  try {
    const brotliModule = await import('brotli-wasm');
    brotli = await brotliModule.default;
  } catch (err) {
    console.warn('[RAILGUN] Failed to load brotli-wasm for POI decompression:', err);
  }

  for (const poiVariant of POI_VARIANTS) {
    // POI artifacts are stored at: {prefix}/poi-nov-2-23/POI_XxY/
    const storageDir = `${prefix}/${getPOIStorageDir(poiVariant)}`;

    // Check if ALL artifacts are already cached and valid (vkey, zkey, wasm)
    const existingVkey = await artifactStorage.getItem(`${storageDir}/vkey.json`);
    const existingZkey = await artifactStorage.getItem(`${storageDir}/zkey`);
    const existingWasm = await artifactStorage.getItem(`${storageDir}/wasm`);

    // All three must exist for POI to work
    if (existingVkey && existingZkey && existingWasm) {
      try {
        const parsed = JSON.parse(existingVkey as string);
        if (parsed.curve) {
          continue;
        }
      } catch {
        // Corrupted, continue to re-download
      }
    }

    try {
      // POI artifacts use a DIFFERENT IPFS hash: POI_ARTIFACT_IPFS_HASH
      // IPFS path: POI_3x3/vkey.json (not poi-nov-2-23/POI_3x3)
      // Try RAILGUN's official gateway first (more reliable), then fallback to our API proxy

      let vkeyData: string | null = null;

      // Try RAILGUN's official gateway first (direct)
      const railgunVkeyUrl = `${RAILGUN_IPFS_GATEWAY}/${POI_ARTIFACT_IPFS_HASH}/${poiVariant}/vkey.json`;

      try {
        const vkeyResponse = await fetch(railgunVkeyUrl, { signal: AbortSignal.timeout(30000) });
        if (vkeyResponse.ok) {
          vkeyData = await vkeyResponse.text();
        }
      } catch {
        // Gateway failed, try fallback
      }

      // Fallback to our API proxy if RAILGUN gateway failed
      if (!vkeyData) {
        const proxyVkeyUrl = `/api/ipfs/${POI_ARTIFACT_IPFS_HASH}/${poiVariant}/vkey.json`;
        try {
          const vkeyResponse = await fetch(proxyVkeyUrl, { signal: AbortSignal.timeout(30000) });
          if (vkeyResponse.ok) {
            vkeyData = await vkeyResponse.text();
          }
        } catch {
          // Proxy failed too
        }
      }

      if (!vkeyData) {
        console.warn(`[RAILGUN] Could not fetch POI vkey for ${poiVariant}`);
        continue;
      }

      // Validate vkey has required fields
      try {
        const parsed = JSON.parse(vkeyData);
        if (!parsed.curve) {
          continue;
        }
      } catch {
        continue;
      }

      await artifactStorage.setItem(`${storageDir}/vkey.json`, vkeyData);

      // Download zkey (brotli compressed on IPFS)
      const railgunZkeyUrl = `${RAILGUN_IPFS_GATEWAY}/${POI_ARTIFACT_IPFS_HASH}/${poiVariant}/zkey.br`;
      try {
        const zkeyResponse = await fetch(railgunZkeyUrl, { signal: AbortSignal.timeout(120000) });
        if (zkeyResponse.ok) {
          const zkeyCompressed = new Uint8Array(await zkeyResponse.arrayBuffer());
          if (brotli) {
            const zkeyDecompressed = brotli.decompress(zkeyCompressed);
            await artifactStorage.setItem(`${storageDir}/zkey`, zkeyDecompressed.buffer);
          } else {
            // If no brotli, store compressed (SDK might handle it)
            await artifactStorage.setItem(`${storageDir}/zkey`, zkeyCompressed.buffer);
          }
        }
      } catch {
        // zkey fetch failed
      }

      // Download wasm (brotli compressed on IPFS)
      const railgunWasmUrl = `${RAILGUN_IPFS_GATEWAY}/${POI_ARTIFACT_IPFS_HASH}/${poiVariant}/wasm.br`;
      try {
        const wasmResponse = await fetch(railgunWasmUrl, { signal: AbortSignal.timeout(60000) });
        if (wasmResponse.ok) {
          const wasmCompressed = new Uint8Array(await wasmResponse.arrayBuffer());
          if (brotli) {
            const wasmDecompressed = brotli.decompress(wasmCompressed);
            await artifactStorage.setItem(`${storageDir}/wasm`, wasmDecompressed.buffer);
          } else {
            await artifactStorage.setItem(`${storageDir}/wasm`, wasmCompressed.buffer);
          }
        }
      } catch {
        // WASM is optional for POI
      }
    } catch (err) {
      console.warn(`[RAILGUN] Failed to download POI ${poiVariant}:`, err);
    }
  }
}

/**
 * Load provider for a specific network (on-demand)
 */
export async function loadNetworkProvider(network: NetworkNameType): Promise<boolean> {
  // Always ensure artifacts are downloaded first (even if provider already loaded)
  // This handles the case where new variants are added after HMR
  if (isInitialized) {
    currentArtifactNetwork = network;
    await downloadNetworkArtifacts(network);
  }

  // Already loaded
  if (loadedProviders.has(network)) {
    return true;
  }

  // Currently loading this network - wait for existing promise
  const existingPromise = loadingPromises.get(network);
  if (existingPromise) {
    return existingPromise;
  }

  if (!isInitialized) {
    console.warn('[RAILGUN] Cannot load provider - SDK not initialized');
    return false;
  }

  // Create loading promise and store it
  const loadPromise = (async (): Promise<boolean> => {
    try {
      // Set current network for artifact storage (affects path resolution)
      currentArtifactNetwork = network;

      // Artifacts already downloaded above, but call again to ensure consistency
      await downloadNetworkArtifacts(network);

      // Pre-download common circuit artifacts in background
      // Don't await - let it run in parallel with provider loading
      if (artifactStorageRef) {
        predownloadArtifacts(artifactStorageRef, network, ['1x2', '2x2', '2x3']).catch(
          (err) => console.warn('[RAILGUN] Background artifact preload failed:', err),
        );
      }

      const { loadProvider } = await import('@railgun-community/wallet');
      const providerConfig = createProviderConfig(network);


      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await loadProvider(providerConfig, network as any, 30000); // 30s timeout

      loadedProviders.add(network);
      logMemoryUsage('Provider loaded');

      return true;
    } catch (err) {
      // Check if it's a rate limit error
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
        console.warn(`[RAILGUN] Rate limit hit for ${network}, will retry on next request`);
      } else {
        console.warn(`[RAILGUN] Failed to load provider for ${network}:`, errorMessage);
      }
      return false;
    } finally {
      loadingPromises.delete(network);
    }
  })();

  loadingPromises.set(network, loadPromise);
  return loadPromise;
}

/**
 * Check if provider is loaded for a network
 */
export function isProviderLoaded(network: NetworkNameType): boolean {
  return loadedProviders.has(network);
}

/**
 * Manually pre-download artifacts for a network
 * Call this to ensure artifacts are cached before generating proofs
 */
export async function ensureArtifactsDownloaded(
  network: NetworkNameType,
  // NOTE: SDK uses raw numbers without leading zeros (e.g., "1x2", not "01x02")
  circuits: string[] = ['1x2', '2x2', '2x3'],
): Promise<void> {
  if (!artifactStorageRef) {
    console.warn('[RAILGUN] Artifact storage not initialized');
    return;
  }
  await predownloadArtifacts(artifactStorageRef, network, circuits);
}

// Balance polling removed - balances are now fetched on-demand only
// (page load and after transactions) to avoid Infura rate limits

/**
 * Stop the RAILGUN engine
 */
export async function shutdownRailgun(): Promise<void> {
  if (!isInitialized) {
    return;
  }

  try {
    const { stopRailgunEngine } = await import('@railgun-community/wallet');
    await stopRailgunEngine();
  } catch (e) {
    console.warn('[RAILGUN] Error stopping engine:', e);
  }

  isInitialized = false;
  initializationPromise = null;
  loadedProviders.clear();
  loadingPromises.clear();

  // Clear global state
  if (typeof window !== 'undefined') {
    (window as any).__RAILGUN_INITIALIZED__ = false;
    (window as any).__RAILGUN_INIT_PROMISE__ = null;
  }

}

/**
 * Clear ZK proof artifact cache
 * Use this to force re-download of artifacts if you're experiencing Invalid Snark Proof errors
 * After clearing, the user needs to reload the page to re-initialize RAILGUN
 */
export async function clearArtifactCache(): Promise<void> {
  try {
    const localforage = (await import('localforage')).default;
    const artifactStorage = localforage.createInstance({
      name: 'railgun-artifacts',
    });
    await artifactStorage.clear();
  } catch (err) {
    console.error('[RAILGUN] Failed to clear artifact cache:', err);
    throw new Error('Failed to clear artifact cache');
  }
}

/**
 * Get artifact cache info for debugging
 */
export async function getArtifactCacheInfo(): Promise<{
  version: string | null;
  itemCount: number;
}> {
  try {
    const localforage = (await import('localforage')).default;
    const artifactStorage = localforage.createInstance({
      name: 'railgun-artifacts',
    });

    const version = await artifactStorage.getItem<string>('artifact-version');
    const keys = await artifactStorage.keys();

    return {
      version,
      itemCount: keys.length,
    };
  } catch (err) {
    console.error('[RAILGUN] Failed to get artifact cache info:', err);
    return { version: null, itemCount: 0 };
  }
}

/**
 * Diagnose vkey issues for a network
 * Returns info about the vkey files and whether they have the required 'curve' property
 */
export async function diagnoseVkeyIssues(network: NetworkNameType): Promise<{
  hasIssues: boolean;
  details: Array<{ variant: string; path: string; hasCurve: boolean; curveValue?: string; error?: string }>;
}> {
  const localforage = (await import('localforage')).default;
  const artifactStorage = localforage.createInstance({
    name: 'railgun-artifacts',
  });

  const prefix = getArtifactPrefix(network);
  // NOTE: SDK uses raw numbers without leading zeros (e.g., "1x2", not "01x02")
  // Check all common circuit variants
  const variants = ['1x2', '1x3', '2x2', '2x3', '3x1', '3x2', '3x3', '8x2'];
  const details: Array<{ variant: string; path: string; hasCurve: boolean; curveValue?: string; error?: string }> = [];
  let hasIssues = false;

  for (const variant of variants) {
    const path = `${prefix}/${variant}/vkey.json`;
    try {
      const vkeyData = await artifactStorage.getItem<string | ArrayBuffer>(path);

      if (!vkeyData) {
        details.push({ variant, path, hasCurve: false, error: 'vkey not found in storage' });
        hasIssues = true;
        continue;
      }

      // Parse vkey if it's a string
      let vkey: { curve?: string };
      if (typeof vkeyData === 'string') {
        try {
          vkey = JSON.parse(vkeyData);
        } catch {
          details.push({ variant, path, hasCurve: false, error: 'vkey is not valid JSON' });
          hasIssues = true;
          continue;
        }
      } else {
        // ArrayBuffer - convert to string first
        const text = new TextDecoder().decode(vkeyData);
        try {
          vkey = JSON.parse(text);
        } catch {
          details.push({ variant, path, hasCurve: false, error: 'vkey ArrayBuffer is not valid JSON' });
          hasIssues = true;
          continue;
        }
      }

      if (!vkey.curve) {
        details.push({ variant, path, hasCurve: false, error: 'vkey missing "curve" property' });
        hasIssues = true;
      } else {
        details.push({ variant, path, hasCurve: true, curveValue: vkey.curve });
      }
    } catch (err) {
      details.push({ variant, path, hasCurve: false, error: `Error: ${err instanceof Error ? err.message : String(err)}` });
      hasIssues = true;
    }
  }

  return { hasIssues, details };
}

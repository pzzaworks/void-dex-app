import { initializeRailgun } from './init';
import {
  NetworkNameType,
  SUPPORTED_NETWORKS,
  NETWORK_TO_CHAIN,
  getDeploymentBlock,
} from './constants';

const WALLET_STORAGE_KEY = 'voiddex-railgun-wallet';
const PBKDF2_ITERATIONS = 100000;

// Guard against concurrent wallet loading (WASM can only be instantiated once)
let walletLoadingPromise: Promise<RailgunWalletWithKey> | null = null;

// Local wallet info interface (matches @railgun-community/shared-models RailgunWalletInfo)
export interface RailgunWalletInfo {
  id: string;
  railgunAddress: string;
}

// Extended wallet info with encryption key (returned after create/load)
export interface RailgunWalletWithKey extends RailgunWalletInfo {
  encryptionKey: string;
}

interface StoredWalletInfo {
  walletId: string;
  railgunAddress: string;
  createdAt: number;
}

/**
 * Generate a new mnemonic phrase (12 words)
 * Uses dynamic import for ethers
 */
export async function generateMnemonicAsync(): Promise<string> {
  const { Mnemonic, randomBytes } = await import('ethers');
  const mnemonic = Mnemonic.fromEntropy(randomBytes(16)).phrase.trim();
  return mnemonic;
}

/**
 * Generate a new mnemonic phrase (12 words) - synchronous version
 * Uses ethers.js Mnemonic with proper BIP-39 checksum
 */
export function generateMnemonic(): string {
  // Import ethers synchronously (works in browser after initial load)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Mnemonic, randomBytes } = require('ethers');
  const mnemonic = Mnemonic.fromEntropy(randomBytes(16)).phrase.trim();
  return mnemonic;
}

/**
 * Validate a mnemonic phrase
 */
export async function validateMnemonicAsync(mnemonic: string): Promise<boolean> {
  try {
    const { Mnemonic } = await import('ethers');
    Mnemonic.fromPhrase(mnemonic);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate a mnemonic phrase - synchronous version
 */
export function validateMnemonic(mnemonic: string): boolean {
  // Basic validation: check word count
  const words = mnemonic.trim().split(/\s+/);
  return words.length === 12 || words.length === 24;
}

/**
 * Derive encryption key from password
 * Uses PBKDF2 for key derivation
 * Returns 32-byte hex string (64 chars) without 0x prefix
 */
export async function deriveEncryptionKey(password: string): Promise<string> {
  const { pbkdf2 } = await import('ethers');
  const salt = 'voiddex-railgun-salt';
  const keyMaterial = await pbkdf2(
    Buffer.from(password),
    Buffer.from(salt),
    PBKDF2_ITERATIONS,
    32,
    'sha256',
  );
  // Remove 0x prefix - RAILGUN expects exactly 32 bytes (64 hex chars)
  return keyMaterial.startsWith('0x') ? keyMaterial.slice(2) : keyMaterial;
}

/**
 * Create a new RAILGUN wallet
 * Returns wallet info with encryption key for future operations
 */
export async function createPrivateWallet(
  password: string,
  mnemonic: string,
): Promise<RailgunWalletWithKey> {
  // Ensure RAILGUN is initialized - always call this to ensure init is complete
  await initializeRailgun();

  // Validate mnemonic
  const isValid = await validateMnemonicAsync(mnemonic);
  if (!isValid) {
    throw new Error('Invalid mnemonic phrase');
  }

  // Derive encryption key from password
  const encryptionKey = await deriveEncryptionKey(password);

  // Create block map for optimization
  // For NEW wallets, use recent blocks (not deployment blocks) to minimize initial scan
  // The wallet can only see transactions AFTER this block, so we use a small buffer
  // Users importing existing wallets should use deployment blocks instead
  const creationBlockMap: Record<string, number> = {};

  // Get current block numbers for each network (approximate - will be fetched on first scan)
  // These are recent block estimates as of late 2024 - SDK will adjust if needed
  const RECENT_BLOCKS: Record<string, number> = {
    Ethereum: 21000000, // Dec 2024
    Polygon: 65000000, // Dec 2024
    Arbitrum: 270000000, // Dec 2024
    BNB_Chain: 44000000, // Dec 2024
    Ethereum_Sepolia: 7000000, // Dec 2024 - much more recent than deployment
  };

  for (const network of SUPPORTED_NETWORKS) {
    // Use recent block if available, otherwise fall back to deployment block
    creationBlockMap[network] = RECENT_BLOCKS[network] || getDeploymentBlock(network);
  }

  // Dynamic import of wallet SDK
  const { createRailgunWallet } = await import('@railgun-community/wallet');

  // Create the wallet
  const walletInfo = await createRailgunWallet(encryptionKey, mnemonic, creationBlockMap);

  // Store wallet info
  storeWalletInfo({
    walletId: walletInfo.id,
    railgunAddress: walletInfo.railgunAddress,
    createdAt: Date.now(),
  });

  return {
    ...walletInfo,
    encryptionKey,
  };
}

/**
 * Load an existing RAILGUN wallet by ID using encryption key directly
 * Used for session restoration
 */
export async function loadPrivateWalletWithKey(
  encryptionKey: string,
  walletId: string,
): Promise<RailgunWalletWithKey> {
  // Return existing promise if already loading (prevents WASM out of memory)
  if (walletLoadingPromise) {
    return walletLoadingPromise;
  }

  walletLoadingPromise = (async () => {
    try {

      // Ensure RAILGUN is initialized first - MUST complete before wallet load
      await initializeRailgun();

      // Dynamic import of wallet SDK
      const { loadWalletByID, walletForID } = await import('@railgun-community/wallet');

      // Check if wallet is already loaded
      try {
        const existingWallet = walletForID(walletId);
        if (existingWallet) {
          // Use getAddress() method instead of railgunAddress property
          const railgunAddress = existingWallet.getAddress();
          if (railgunAddress) {
            return {
              id: walletId,
              railgunAddress,
              encryptionKey,
            };
          }
        }
      } catch {
        // Wallet not found or not loaded yet - continue to load
      }

      // Load the wallet
      const walletInfo = await loadWalletByID(encryptionKey, walletId, false);
      return {
        ...walletInfo,
        encryptionKey,
      };
    } catch (error: any) {
      const lastError = error instanceof Error ? error : new Error('Unknown error');
      const errorMsg = lastError.message?.toLowerCase() || '';

      // Check for specific error types - these are expected failures, not errors
      if (
        errorMsg.includes('decrypt') ||
        errorMsg.includes('ciphertext') ||
        errorMsg.includes('could not load')
      ) {
        // Session expired or wallet already loaded differently - expected during HMR
        throw new Error('Session expired or invalid. Please unlock your wallet again.');
      }

      // Unexpected error - log it
      console.error('[RAILGUN] Wallet load failed:', error?.message || error);
      throw new Error(lastError.message || 'Could not load RAILGUN wallet. Please try again.');
    } finally {
      walletLoadingPromise = null;
    }
  })();

  return walletLoadingPromise;
}

/**
 * Load an existing RAILGUN wallet by ID
 * Returns wallet info with encryption key for future operations
 */
export async function loadPrivateWallet(
  password: string,
  walletId: string,
): Promise<RailgunWalletWithKey> {
  let lastError: Error | null = null;
  const maxRetries = 2;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {

      // Ensure RAILGUN is initialized - always call this to ensure init is complete
      await initializeRailgun();

      // Derive encryption key from password
      const encryptionKey = await deriveEncryptionKey(password);

      // Dynamic import of wallet SDK
      const { loadWalletByID } = await import('@railgun-community/wallet');

      // Load the wallet
      const walletInfo = await loadWalletByID(encryptionKey, walletId, false);
      return {
        ...walletInfo,
        encryptionKey,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // Helper function to check error chain recursively
      const hasPasswordError = (err: any): boolean => {
        if (!err) return false;

        // Check error as string
        const errStr = String(err).toLowerCase();
        if (
          errStr.includes('decrypt') ||
          errStr.includes('ciphertext') ||
          errStr.includes('encryption')
        ) {
          return true;
        }

        // Check message
        if (err.message) {
          const msg = String(err.message).toLowerCase();
          if (msg.includes('decrypt') || msg.includes('ciphertext') || msg.includes('encryption')) {
            return true;
          }
        }

        // Check stack
        if (err.stack) {
          const stack = String(err.stack).toLowerCase();
          if (stack.includes('decrypt') || stack.includes('ciphertext')) {
            return true;
          }
        }

        // Check cause recursively
        if (err.cause) {
          return hasPasswordError(err.cause);
        }

        return false;
      };

      // Don't retry on password errors - fail immediately
      if (hasPasswordError(error)) {
        throw new Error('Incorrect password. Please try again.');
      }

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff before retry: 500ms, 1000ms, 2000ms...
      const backoffMs = 500 * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  // All retries failed

  // Helper to check error chain recursively (same as above)
  const checkPasswordError = (err: any): boolean => {
    if (!err) return false;
    const errStr = String(err).toLowerCase();
    if (
      errStr.includes('decrypt') ||
      errStr.includes('ciphertext') ||
      errStr.includes('encryption')
    ) {
      return true;
    }
    if (
      err.message &&
      String(err.message)
        .toLowerCase()
        .match(/decrypt|ciphertext|encryption/)
    ) {
      return true;
    }
    if (err.cause) {
      return checkPasswordError(err.cause);
    }
    return false;
  };

  // Check for password errors one more time
  if (checkPasswordError(lastError)) {
    throw new Error('Incorrect password. Please try again.');
  }

  // Network errors
  const finalErrorMsg = lastError?.message?.toLowerCase() || '';
  if (finalErrorMsg.includes('no response') || finalErrorMsg.includes('timeout')) {
    throw new Error('Network connection timeout. Please check your internet and try again.');
  }

  if (finalErrorMsg.includes('eth_getlogs')) {
    throw new Error('Unable to sync with blockchain. Please try again in a moment.');
  }

  throw new Error(lastError?.message || 'Could not load RAILGUN wallet. Please try again.');
}

/**
 * Unload wallet from memory (doesn't delete stored data)
 */
export async function unloadPrivateWallet(walletId: string): Promise<void> {
  const { unloadWalletByID } = await import('@railgun-community/wallet');
  await unloadWalletByID(walletId);
}

/**
 * Get wallet mnemonic (requires password)
 */
export async function getPrivateWalletMnemonic(
  password: string,
  walletId: string,
): Promise<string> {
  const encryptionKey = await deriveEncryptionKey(password);
  const { getWalletMnemonic } = await import('@railgun-community/wallet');
  const mnemonic = await getWalletMnemonic(encryptionKey, walletId);
  return mnemonic;
}

/**
 * Refresh wallet balances for a specific network (only if provider is loaded)
 * Non-blocking - runs in background
 */
export async function refreshPrivateBalances(
  walletId: string,
  network?: NetworkNameType,
): Promise<void> {
  const { isProviderLoaded } = await import('./init');

  // If no network specified, skip (don't refresh all networks)
  if (!network) {
    return;
  }

  // Check if provider is loaded for this network
  const providerLoaded = isProviderLoaded(network);

  if (!providerLoaded) {
    return;
  }

  try {
    const { refreshBalances } = await import('@railgun-community/wallet');
    const chain = getChainForNetwork(network);
    await refreshBalances(chain, [walletId]);
  } catch (err) {
    console.warn(`[RAILGUN] Balance refresh failed for ${network}:`, err);
    // Don't throw - not critical for UI
  }
}

/**
 * Rescan wallet (full UTXO scan) for all networks
 */
export async function rescanPrivateWallet(walletId: string): Promise<void> {
  const { rescanFullUTXOMerkletreesAndWallets } = await import('@railgun-community/wallet');

  for (const network of SUPPORTED_NETWORKS) {
    try {
      const chain = getChainForNetwork(network);
      await rescanFullUTXOMerkletreesAndWallets(chain, [walletId]);
    } catch (err) {
      console.warn(`[RAILGUN] Failed to rescan for ${network}:`, err);
    }
  }
}

/**
 * Scan merkle tree and refresh balances for a specific network
 * Call this after shield/unshield transactions to see updated balances
 */
export async function scanAndRefreshBalances(
  walletId: string,
  network: NetworkNameType,
): Promise<void> {
  const { isProviderLoaded } = await import('./init');

  // Provider must be loaded
  if (!isProviderLoaded(network)) {
    console.warn(`[RAILGUN] Cannot scan - provider not loaded for ${network}`);
    return;
  }

  try {
    const { refreshBalances } = await import('@railgun-community/wallet');
    const chain = getChainForNetwork(network);

    // Refresh balances from merkle tree
    await refreshBalances(chain, [walletId]);
  } catch (err) {
    console.error(`[RAILGUN] Balance refresh failed for ${network}:`, err);
    throw err;
  }
}

// Helper to get chain object for network
function getChainForNetwork(network: NetworkNameType) {
  const chainId = NETWORK_TO_CHAIN[network] || 1;
  return { type: 0, id: chainId };
}

// Local storage helpers
function storeWalletInfo(info: StoredWalletInfo): void {
  try {
    localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(info));
  } catch {
    console.warn('[RAILGUN] Failed to store wallet info');
  }
}

export function getStoredWalletInfo(): StoredWalletInfo | null {
  try {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(WALLET_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.warn('[RAILGUN] Failed to get stored wallet info');
  }
  return null;
}

export function clearStoredWalletInfo(): void {
  try {
    localStorage.removeItem(WALLET_STORAGE_KEY);
  } catch {
    console.warn('[RAILGUN] Failed to clear stored wallet info');
  }
}

/**
 * Check if a wallet exists in storage
 */
export function hasStoredWallet(): boolean {
  return getStoredWalletInfo() !== null;
}

/**
 * Get the chain-specific RAILGUN address for a wallet
 * IMPORTANT: RAILGUN addresses vary by chain! Always use this for transactions.
 */
export async function getRailgunAddressForChain(
  walletId: string,
  chainId: number,
): Promise<string | null> {
  try {
    const { walletForID } = await import('@railgun-community/wallet');
    const wallet = walletForID(walletId);
    if (!wallet) {
      console.warn('[RAILGUN] Wallet not found for ID:', walletId);
      return null;
    }
    const chain = { type: 0, id: chainId };
    const address = wallet.getAddress(chain);
    return address;
  } catch (err) {
    console.error('[RAILGUN] Failed to get chain-specific address:', err);
    return null;
  }
}

/**
 * Get token balances for a wallet on a specific network
 * @param tokenAddresses - Optional list of token addresses to check. If empty, checks common tokens.
 */
export async function getTokenBalancesForWallet(
  walletId: string,
  chainId: number,
  tokenAddresses?: string[],
): Promise<
  Array<{
    tokenAddress: string;
    symbol: string;
    balance: string;
    balanceFormatted: string;
    decimals: number;
  }>
> {
  try {
    const { getShieldedBalances, getWethAddress } = await import('./shield');
    const { getToken } = await import('@/services/tokens');
    const { getNetworkForChain } = await import('./constants');

    // Get network name from chain ID
    const network = getNetworkForChain(chainId);
    if (!network) {
      console.warn(`[RAILGUN] No network found for chain ${chainId}`);
      return [];
    }

    // Build list of tokens to check
    const addressesToCheck: string[] = tokenAddresses ? [...tokenAddresses] : [];

    // Always include WETH (shielded ETH becomes WETH)
    const wethAddress = getWethAddress(network);
    if (wethAddress && !addressesToCheck.includes(wethAddress.toLowerCase())) {
      addressesToCheck.push(wethAddress);
    }

    // Get balances from RAILGUN SDK
    const balanceMap = await getShieldedBalances(walletId, network, addressesToCheck);

    // Convert to our format with token info
    const tokenBalances: Array<{
      tokenAddress: string;
      symbol: string;
      balance: string;
      balanceFormatted: string;
      decimals: number;
    }> = [];

    for (const [tokenAddress, balance] of balanceMap) {
      try {
        // Get token info (symbol, decimals)
        const tokenInfo = await getToken(chainId, tokenAddress);

        // Format balance
        const decimals = tokenInfo?.decimals || 18;
        const divisor = BigInt(10 ** decimals);
        const intPart = balance / divisor;
        const decPart = balance % divisor;
        const decStr = decPart.toString().padStart(decimals, '0').slice(0, 6);
        const balanceFormatted = `${intPart}.${decStr}`;

        tokenBalances.push({
          tokenAddress,
          symbol: tokenInfo?.symbol || 'WETH',
          balance: balance.toString(),
          balanceFormatted,
          decimals,
        });
      } catch {
        // Still include the balance even if we can't get token info
        const decimals = 18;
        const divisor = BigInt(10 ** decimals);
        const intPart = balance / divisor;
        const decPart = balance % divisor;
        const decStr = decPart.toString().padStart(decimals, '0').slice(0, 6);

        tokenBalances.push({
          tokenAddress,
          symbol: 'WETH',
          balance: balance.toString(),
          balanceFormatted: `${intPart}.${decStr}`,
          decimals,
        });
      }
    }

    return tokenBalances;
  } catch (err) {
    console.error('[RAILGUN] Failed to get token balances:', err);
    return [];
  }
}

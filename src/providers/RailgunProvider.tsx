'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useAccount } from 'wagmi';
import { useRailgunWallet, type RailgunWalletStatus } from '@/hooks/useRailgunWallet';
import type { RailgunWalletInfo, NetworkNameType, TokenBalanceInfo } from '@/services/railgun';
import {
  getNetworkForChain,
  loadNetworkProvider,
  isProviderLoaded,
  getRailgunAddressForChain,
  hasNetworkArtifacts,
  onScanProgress,
  getShieldedBalancesDetailed,
  getWethAddress,
  NETWORK_TO_CHAIN,
} from '@/services/railgun';
import { initializeWakuRelayer } from '@/services/railgun/relayer';
import { getTokens } from '@/services/tokens';
import { formatUnits } from 'viem';

type ProviderStatus = 'idle' | 'loading' | 'ready' | 'error';

// Detailed loading stages for UI
export type PrivacyLoadingStage =
  | 'idle'
  | 'initializing_engine'
  | 'loading_wallet'
  | 'checking_artifacts'
  | 'downloading_artifacts'
  | 'connecting_network'
  | 'syncing_data'
  | 'ready'
  | 'error';

export interface PrivacyLoadingState {
  stage: PrivacyLoadingStage;
  progress: number; // 0-100
  message: string;
  isBlocking: boolean; // Should block the UI
}

// Shielded balance info with formatted values
export interface ShieldedTokenBalance {
  tokenAddress: string;
  total: bigint;
  spendable: bigint;
  pending: bigint;
  decimals: number;
  totalFormatted: string;
  spendableFormatted: string;
  pendingFormatted: string;
}

interface RailgunContextValue {
  status: RailgunWalletStatus;
  wallet: RailgunWalletInfo | null;
  railgunAddress: string | null; // Chain-specific RAILGUN address (changes with network!)
  encryptionKey: string | null;
  error: string | null;
  isScanning: boolean;
  scanProgress: number;
  isInitialized: boolean;
  isReady: boolean;
  isLocked: boolean;
  hasWallet: boolean;
  createWallet: (
    password: string,
    mnemonic?: string,
  ) => Promise<{ wallet: RailgunWalletInfo; mnemonic: string }>;
  unlockWallet: (password: string) => Promise<RailgunWalletInfo>;
  lockWallet: () => Promise<void>;
  deleteWallet: () => Promise<void>;
  newMnemonic: () => string;
  checkMnemonic: (mnemonic: string) => boolean;
  // Provider state
  providerStatus: ProviderStatus;
  currentNetwork: NetworkNameType | null;
  isProviderReady: boolean;
  hasArtifactsCached: boolean; // True if artifacts are already downloaded
  loadProvider: (network: NetworkNameType) => Promise<boolean>;
  // Detailed loading state for overlay UI
  loadingState: PrivacyLoadingState;
  // Shielded balances
  shieldedBalances: Map<string, ShieldedTokenBalance>; // tokenAddress -> balance
  isLoadingBalances: boolean;
  refreshShieldedBalances: (forceRefresh?: boolean) => Promise<void>;
  getShieldedBalance: (tokenAddress: string) => ShieldedTokenBalance | null;
  getFormattedShieldedBalance: (tokenAddress: string, decimals?: number) => string;
}

const RailgunContext = createContext<RailgunContextValue | null>(null);

export function RailgunProvider({ children }: { children: React.ReactNode }) {
  const railgunWallet = useRailgunWallet();
  const { chainId, isConnected } = useAccount();

  // Provider state
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>('idle');
  const [currentNetwork, setCurrentNetwork] = useState<NetworkNameType | null>(null);
  const [chainSpecificAddress, setChainSpecificAddress] = useState<string | null>(null);
  const [hasArtifactsCached, setHasArtifactsCached] = useState(false);
  const [loadingState, setLoadingState] = useState<PrivacyLoadingState>({
    stage: 'idle',
    progress: 0,
    message: '',
    isBlocking: false,
  });
  const loadingRef = useRef(false);
  const loadedNetworksRef = useRef<Set<NetworkNameType>>(new Set());

  // Shielded balance state
  const [shieldedBalances, setShieldedBalances] = useState<Map<string, ShieldedTokenBalance>>(new Map());
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const balanceFetchRef = useRef(false);
  const lastBalanceFetchRef = useRef<number>(0);

  // Load provider for a network (cached - only loads once per network per session)
  const loadProvider = useCallback(async (network: NetworkNameType): Promise<boolean> => {
    // Already loaded this session
    if (loadedNetworksRef.current.has(network)) {
      setCurrentNetwork(network);
      setProviderStatus('ready');
      setLoadingState({ stage: 'ready', progress: 100, message: 'Privacy system ready', isBlocking: false });
      return true;
    }

    // Check if already loaded in SDK
    if (isProviderLoaded(network)) {
      loadedNetworksRef.current.add(network);
      setCurrentNetwork(network);
      setProviderStatus('ready');
      setLoadingState({ stage: 'ready', progress: 100, message: 'Privacy system ready', isBlocking: false });
      return true;
    }

    // Prevent concurrent loads
    if (loadingRef.current) {
      return false;
    }

    loadingRef.current = true;
    setCurrentNetwork(network);

    // Stage 1: Check artifacts
    setLoadingState({
      stage: 'checking_artifacts',
      progress: 10,
      message: 'Checking cryptographic files...',
      isBlocking: true,
    });

    const cached = await hasNetworkArtifacts(network);
    setHasArtifactsCached(cached);

    // Stage 2: Download artifacts if needed
    if (!cached) {
      setLoadingState({
        stage: 'downloading_artifacts',
        progress: 20,
        message: 'Downloading cryptographic files...',
        isBlocking: true,
      });
    }

    // Stage 3: Connect to network
    setLoadingState({
      stage: 'connecting_network',
      progress: cached ? 30 : 40,
      message: 'Connecting to privacy network...',
      isBlocking: true,
    });

    setProviderStatus('loading');

    try {

      // Stage 4: Syncing (will be updated by scan progress callback)
      setLoadingState({
        stage: 'syncing_data',
        progress: 50,
        message: 'Syncing privacy data...',
        isBlocking: true,
      });

      const success = await loadNetworkProvider(network);

      if (success) {
        loadedNetworksRef.current.add(network);
        setProviderStatus('ready');
        setLoadingState({
          stage: 'ready',
          progress: 100,
          message: 'Privacy system ready',
          isBlocking: false,
        });
      } else {
        setProviderStatus('error');
        setLoadingState({
          stage: 'error',
          progress: 0,
          message: 'Failed to connect to privacy network',
          isBlocking: true,
        });
        console.warn(`[RailgunProvider] Failed to load provider for ${network}`);
      }

      return success;
    } catch (err) {
      console.error(`[RailgunProvider] Provider load error:`, err);
      setProviderStatus('error');
      setLoadingState({
        stage: 'error',
        progress: 0,
        message: 'Connection error. Please try again.',
        isBlocking: true,
      });
      return false;
    } finally {
      loadingRef.current = false;
    }
  }, []);

  // Refresh shielded balances for current network
  const refreshShieldedBalances = useCallback(async (forceRefresh = false) => {
    const network = currentNetwork || (chainId ? getNetworkForChain(chainId) : null);
    const networkChainId = chainId || (network ? NETWORK_TO_CHAIN[network] : null);

    if (!railgunWallet.wallet || !railgunWallet.isReady || !network || !networkChainId) {
      return;
    }

    if (!isProviderLoaded(network)) {
      return;
    }

    // Prevent concurrent fetches
    if (balanceFetchRef.current) {
      return;
    }

    // Rate limit: 10 seconds minimum between fetches (unless forced)
    const now = Date.now();
    if (!forceRefresh && now - lastBalanceFetchRef.current < 10000) {
      return;
    }

    balanceFetchRef.current = true;
    lastBalanceFetchRef.current = now;
    setIsLoadingBalances(true);

    try {

      // First refresh merkle tree to get latest UTXOs
      const { refreshBalances } = await import('@railgun-community/wallet');
      const chain = { type: 0, id: networkChainId };
      await refreshBalances(chain, [railgunWallet.wallet.id]);

      // Fetch token list from API (get all tokens for this chain)
      let tokenAddresses: string[] = [];
      const tokenDecimalsMap = new Map<string, number>();
      try {
        const tokensResponse = await getTokens({ chainId: networkChainId, limit: 50 });
        for (const token of tokensResponse.tokens) {
          const addr = token.address.toLowerCase();
          // Exclude native token placeholder
          if (addr !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
            tokenAddresses.push(token.address);
            tokenDecimalsMap.set(addr, token.decimals);
          }
        }
      } catch (apiErr) {
        console.warn('[RailgunProvider] Failed to fetch tokens from API:', apiErr);
        // Continue with empty array - getShieldedBalancesDetailed will still check WETH and wallet history
      }

      // Fetch shielded balances for tokens from API
      const balanceMap = await getShieldedBalancesDetailed(
        railgunWallet.wallet.id,
        network,
        tokenAddresses,
      );

      const formattedBalances = new Map<string, ShieldedTokenBalance>();

      for (const [tokenAddress, info] of balanceMap) {
        const decimals = tokenDecimalsMap.get(tokenAddress.toLowerCase()) ?? 18;
        formattedBalances.set(tokenAddress.toLowerCase(), {
          tokenAddress: tokenAddress.toLowerCase(),
          total: info.total,
          spendable: info.spendable,
          pending: info.pending,
          decimals,
          totalFormatted: formatUnits(info.total, decimals),
          spendableFormatted: formatUnits(info.spendable, decimals),
          pendingFormatted: formatUnits(info.pending, decimals),
        });
      }

      setShieldedBalances(formattedBalances);
    } catch (err) {
      console.error('[RailgunProvider] Failed to fetch shielded balances:', err);
    } finally {
      setIsLoadingBalances(false);
      balanceFetchRef.current = false;
    }
  }, [currentNetwork, chainId, railgunWallet.wallet, railgunWallet.isReady]);

  // Get balance for a specific token
  const getShieldedBalance = useCallback((tokenAddress: string): ShieldedTokenBalance | null => {
    const normalizedAddress = tokenAddress.toLowerCase();

    // Check for native token (ETH) - stored as WETH in RAILGUN
    const isNativeToken =
      normalizedAddress === '0x0000000000000000000000000000000000000000' ||
      normalizedAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

    if (isNativeToken) {
      const network = currentNetwork || (chainId ? getNetworkForChain(chainId) : null);
      if (network) {
        const wethAddress = getWethAddress(network);
        if (wethAddress) {
          return shieldedBalances.get(wethAddress.toLowerCase()) || null;
        }
      }
      return null;
    }

    return shieldedBalances.get(normalizedAddress) || null;
  }, [shieldedBalances, currentNetwork, chainId]);

  // Get formatted balance string for a token
  const getFormattedShieldedBalance = useCallback((tokenAddress: string, decimals?: number): string => {
    const balance = getShieldedBalance(tokenAddress);
    if (!balance) return '0';

    // If decimals provided and different from stored, reformat
    if (decimals !== undefined && decimals !== balance.decimals) {
      return formatUnits(balance.total, decimals);
    }

    return balance.totalFormatted;
  }, [getShieldedBalance]);

  // Listen to merkle tree scan progress for detailed loading UI
  useEffect(() => {
    const unsubscribe = onScanProgress((network, progress) => {
      // Only update if we're in syncing stage
      setLoadingState((prev) => {
        if (prev.stage === 'syncing_data' || prev.stage === 'connecting_network') {
          const scaledProgress = 50 + Math.round(progress * 0.5); // 50-100%
          return {
            stage: 'syncing_data',
            progress: scaledProgress,
            message: `Syncing privacy data... ${Math.round(progress)}%`,
            isBlocking: true,
          };
        }
        return prev;
      });
    });

    return unsubscribe;
  }, []);

  // Update chain-specific RAILGUN address when chain or wallet changes
  useEffect(() => {
    if (!chainId || !railgunWallet.isReady || !railgunWallet.wallet) {
      setChainSpecificAddress(null);
      return;
    }

    let cancelled = false;

    const updateAddress = async () => {
      try {
        const address = await getRailgunAddressForChain(railgunWallet.wallet!.id, chainId);
        if (!cancelled && address) {
          setChainSpecificAddress(address);
        }
      } catch (err) {
        console.warn(`[RailgunProvider] Failed to get chain-specific address:`, err);
        if (!cancelled) {
          setChainSpecificAddress(null);
        }
      }
    };

    updateAddress();

    return () => {
      cancelled = true;
    };
  }, [chainId, railgunWallet.isReady, railgunWallet.wallet?.id]);

  // Track if this is the first load (to add delay on page refresh)
  const isFirstLoadRef = useRef(true);
  // Track the last time we attempted to load provider (for rate limiting retries)
  const lastLoadAttemptRef = useRef<number>(0);

  // Auto-load provider and broadcaster when wallet is ready
  // IMPORTANT: Add significant delay on first load to avoid 429 errors on page refresh
  // Public RPCs have aggressive rate limiting - we need to wait for wagmi to stabilize
  useEffect(() => {
    if (!isConnected || !chainId || !railgunWallet.isReady || !railgunWallet.wallet) {
      return;
    }

    const network = getNetworkForChain(chainId);
    if (!network) {
      return;
    }

    let cancelled = false;

    const initializeNetwork = async () => {
      // Rate limit provider load attempts - minimum 10 seconds between attempts
      const now = Date.now();
      const timeSinceLastAttempt = now - lastLoadAttemptRef.current;
      if (lastLoadAttemptRef.current > 0 && timeSinceLastAttempt < 10000) {
        return;
      }

      // Add significant delay on first load to avoid 429 rate limit errors
      // This gives wagmi time to finish its initial RPC calls
      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false;
        await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 second delay
        if (cancelled) return;
      }

      lastLoadAttemptRef.current = Date.now();

      // Load provider if not already loaded
      if (!loadedNetworksRef.current.has(network) && !isProviderLoaded(network)) {
        const success = await loadProvider(network);
        if (!success || cancelled) return;
      } else {
        // Already loaded, just update state
        setCurrentNetwork(network);
        setProviderStatus('ready');
      }

      // Initialize broadcaster (non-blocking) - add delay to avoid more rate limiting
      setTimeout(() => {
        if (!cancelled) {
          initializeWakuRelayer(network).catch((err) => {
            console.warn(`[RailgunProvider] Broadcaster init failed for ${network}:`, err);
          });
        }
      }, 2000); // 2 second delay before broadcaster init
    };

    initializeNetwork();

    return () => {
      cancelled = true;
    };
  }, [chainId, isConnected, railgunWallet.isReady, railgunWallet.wallet?.id, loadProvider]);

  // Fetch balances when provider becomes ready and wallet is unlocked
  // IMPORTANT: Add delay to avoid 429 errors after provider load (which already made RPC calls)
  useEffect(() => {
    if (providerStatus !== 'ready' || !railgunWallet.isReady || !railgunWallet.wallet) {
      return;
    }

    // Add delay to stagger RPC calls after provider load to avoid 429 errors
    // Provider load already made RPC calls, so we wait before fetching balances
    const timeoutId = setTimeout(() => {
      refreshShieldedBalances(true);
    }, 1500); // 1.5 second delay after provider ready

    return () => clearTimeout(timeoutId);
  }, [providerStatus, railgunWallet.isReady, railgunWallet.wallet?.id, refreshShieldedBalances]);

  const value = useMemo(
    () => ({
      ...railgunWallet,
      // Override railgunAddress with chain-specific address when available
      railgunAddress: chainSpecificAddress || railgunWallet.railgunAddress,
      providerStatus,
      currentNetwork,
      isProviderReady: providerStatus === 'ready',
      hasArtifactsCached,
      loadProvider,
      loadingState,
      // Shielded balances
      shieldedBalances,
      isLoadingBalances,
      refreshShieldedBalances,
      getShieldedBalance,
      getFormattedShieldedBalance,
    }),
    [railgunWallet, chainSpecificAddress, providerStatus, currentNetwork, hasArtifactsCached, loadProvider, loadingState, shieldedBalances, isLoadingBalances, refreshShieldedBalances, getShieldedBalance, getFormattedShieldedBalance],
  );

  return <RailgunContext.Provider value={value}>{children}</RailgunContext.Provider>;
}

export function useRailgun() {
  const context = useContext(RailgunContext);
  if (!context) {
    throw new Error('useRailgun must be used within a RailgunProvider');
  }
  return context;
}

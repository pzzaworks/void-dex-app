'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRailgun } from '@/providers/RailgunProvider';
import {
  getShieldedBalancesDetailed,
  NetworkNameType,
  isProviderLoaded,
  getWethAddress,
  TokenBalanceInfo,
  NETWORK_TO_CHAIN,
} from '@/services/railgun';

export interface ShieldedBalance {
  tokenAddress: string;
  balance: bigint;
  balanceFormatted: string;
}

export interface ShieldedBalancesByNetwork {
  [network: string]: Map<string, TokenBalanceInfo>;
}

/**
 * Hook to fetch shielded balances for a wallet on a specific network
 * @param selectedNetwork - The network to fetch balances for
 * @param tokenAddresses - Optional list of token addresses to check (in addition to WETH)
 */
export function useShieldedBalances(selectedNetwork?: NetworkNameType, tokenAddresses?: string[]) {
  const { wallet, isReady } = useRailgun();
  const [balances, setBalances] = useState<ShieldedBalancesByNetwork>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef<Record<string, number>>({});

  const fetchBalances = useCallback(
    async (forceRefresh = false) => {
      // Only fetch if we have a selected network and wallet is ready
      if (!wallet || !isReady || !selectedNetwork) {
        return;
      }

      // Check if provider is loaded for this network
      if (!isProviderLoaded(selectedNetwork)) {
        return;
      }

      // Prevent concurrent fetches and rate limit per network (min 10 seconds, unless forced)
      const now = Date.now();
      const lastFetch = lastFetchRef.current[selectedNetwork] || 0;
      if (!forceRefresh && (isFetchingRef.current || now - lastFetch < 10000)) {
        return;
      }

      isFetchingRef.current = true;
      lastFetchRef.current[selectedNetwork] = now;
      setLoading(true);
      setError(null);

      try {
        // First, refresh balances from merkle tree to ensure we have latest data
        // This is required before reading balances - without it, balances will be 0
        try {
          const { refreshBalances } = await import('@railgun-community/wallet');
          const chainId = NETWORK_TO_CHAIN[selectedNetwork];
          const chain = { type: 0, id: chainId };
          await refreshBalances(chain, [wallet.id]);
        } catch (refreshErr) {
          console.warn('[useShieldedBalances] Balance refresh failed:', refreshErr);
          // Continue anyway - might have cached data
        }

        // Build token list including WETH and any provided addresses
        const addressesToCheck: string[] = tokenAddresses ? [...tokenAddresses] : [];
        const wethAddress = getWethAddress(selectedNetwork);
        if (wethAddress) {
          addressesToCheck.push(wethAddress);
        }

        const networkBalances = await getShieldedBalancesDetailed(
          wallet.id,
          selectedNetwork,
          addressesToCheck,
        );

        setBalances((prev) => ({
          ...prev,
          [selectedNetwork]: networkBalances,
        }));
      } catch (err) {
        console.error('[useShieldedBalances] Error:', err);
        // Silently handle
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [wallet, isReady, selectedNetwork, tokenAddresses],
  );

  // Auto-fetch is DISABLED in this hook to avoid 429 rate limit errors
  // Balance fetching is now centralized in RailgunProvider which handles delays and rate limiting
  // This hook only provides balance access and manual refresh capability
  //
  // If you need to trigger a balance refresh, use the refresh() function explicitly
  // The RailgunProvider will automatically fetch balances when the provider becomes ready
  const initialFetchDone = useRef(false);

  useEffect(() => {
    if (!wallet || !isReady || !selectedNetwork) {
      initialFetchDone.current = false;
      return;
    }

    // Auto-fetch disabled - RailgunProvider handles initial balance fetch with proper delays
    // This prevents multiple simultaneous RPC calls that cause 429 errors
    //
    // The hook is still useful for:
    // 1. Reading balances from state
    // 2. Manual refresh after transactions (pass forceRefresh=true)

    initialFetchDone.current = true;
  }, [selectedNetwork, wallet?.id, isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to balance update callbacks from RAILGUN SDK
  // Disabled auto-refresh from SDK callbacks - too many requests
  // Balance will refresh on manual action or page navigation
  /*
  useEffect(() => {
    if (!wallet || !isReady) {
      return;
    }

    const unsubscribe = onBalanceUpdate((walletId, network) => {
      // Only refresh if this is our wallet and network
      if (walletId === wallet.id && network === selectedNetwork) {
        fetchBalances(true);
      }
    });

    return unsubscribe;
  }, [wallet?.id, isReady, selectedNetwork, fetchBalances]);
  */

  // Get total balance for a specific token on a specific network
  const getBalance = useCallback(
    (network: NetworkNameType, tokenAddress: string): bigint => {
      const networkBalances = balances[network];
      if (!networkBalances) return BigInt(0);

      const normalizedAddress = tokenAddress.toLowerCase();

      // Native token (ETH) is stored as WETH in RAILGUN
      const isNativeToken =
        normalizedAddress === '0x0000000000000000000000000000000000000000' ||
        normalizedAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

      if (isNativeToken) {
        const wethAddress = getWethAddress(network);
        if (wethAddress) {
          const info = networkBalances.get(wethAddress.toLowerCase());
          return info?.total || BigInt(0);
        }
        return BigInt(0);
      }

      const info = networkBalances.get(normalizedAddress);
      return info?.total || BigInt(0);
    },
    [balances],
  );

  // Get detailed balance info (total, spendable, pending) for a token
  const getBalanceInfo = useCallback(
    (network: NetworkNameType, tokenAddress: string): TokenBalanceInfo | null => {
      const networkBalances = balances[network];
      if (!networkBalances) return null;

      const normalizedAddress = tokenAddress.toLowerCase();

      // Native token (ETH) is stored as WETH in RAILGUN
      const isNativeToken =
        normalizedAddress === '0x0000000000000000000000000000000000000000' ||
        normalizedAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

      if (isNativeToken) {
        // Get WETH address for this network
        const wethAddress = getWethAddress(network);
        if (wethAddress) {
          return networkBalances.get(wethAddress.toLowerCase()) || null;
        }
        return null;
      }

      return networkBalances.get(normalizedAddress) || null;
    },
    [balances],
  );

  // Get all balances for a specific network
  const getNetworkBalances = useCallback(
    (network: NetworkNameType): Map<string, TokenBalanceInfo> => {
      return balances[network] || new Map();
    },
    [balances],
  );

  // Check if user has any shielded balance
  const hasAnyBalance = useCallback((): boolean => {
    for (const networkBalances of Object.values(balances)) {
      for (const info of networkBalances.values()) {
        if (info.total > BigInt(0)) return true;
      }
    }
    return false;
  }, [balances]);

  // Get total balance across all networks for a token
  const getTotalBalance = useCallback(
    (tokenAddress: string): bigint => {
      let total = BigInt(0);
      const normalizedAddress = tokenAddress.toLowerCase();

      for (const networkBalances of Object.values(balances)) {
        const info = networkBalances.get(normalizedAddress);
        if (info) total += info.total;
      }

      return total;
    },
    [balances],
  );

  return {
    balances,
    loading,
    error,
    refresh: fetchBalances,
    getBalance,
    getBalanceInfo,
    getNetworkBalances,
    hasAnyBalance,
    getTotalBalance,
  };
}

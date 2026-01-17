import { useState, useCallback, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRailgun } from '@/providers/RailgunProvider';
import { getTokenBalancesForWallet, refreshPrivateBalances } from '@/services/railgun/wallet';
import { getNetworkForChain, isProviderLoaded } from '@/services/railgun';

export interface RailgunTokenBalance {
  tokenAddress: string;
  symbol: string;
  balance: string;
  balanceFormatted: string;
  decimals: number;
}

/**
 * Hook to fetch and manage Railgun private balances
 * Uses the RailgunProvider context for wallet state
 */
export function useRailgunBalance() {
  const { chainId } = useAccount();
  const { wallet: activeWallet, isReady, isProviderReady } = useRailgun();

  const [balances, setBalances] = useState<RailgunTokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);

  /**
   * Fetch private balances for active wallet
   * Balances are fetched on-demand only (not automatically) to avoid Infura rate limits
   */
  const fetchBalances = useCallback(
    async (forceRefresh = false) => {
      // Only fetch if wallet is ready (unlocked) and we have a chain
      if (!isReady || !activeWallet || !chainId) {
        setBalances([]);
        return;
      }

      const network = getNetworkForChain(chainId);
      if (!network) {
        console.warn('[useRailgunBalance] No network for chainId:', chainId);
        return;
      }

      // Check if provider is loaded
      const providerLoaded = isProviderLoaded(network);
      if (!providerLoaded) {
        return;
      }

      // Rate limit: don't fetch more than once every 5 seconds (unless forced)
      const now = Date.now();
      if (!forceRefresh && now - lastFetchRef.current < 5000) {
        return;
      }
      lastFetchRef.current = now;

      setIsLoading(true);
      setError(null);

      try {

        // Always trigger Railgun SDK balance refresh to ensure merkle tree is scanned
        // Without this, balances will be 0 on first fetch
        await refreshPrivateBalances(activeWallet.id, network);
        const tokenBalances = await getTokenBalancesForWallet(activeWallet.id, chainId);

        // Balances fetched successfully

        setBalances(tokenBalances);
      } catch (err: unknown) {
        console.error('[useRailgunBalance] Failed to fetch:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch balances');
        setBalances([]);
      } finally {
        setIsLoading(false);
      }
    },
    [isReady, activeWallet, chainId],
  );

  /**
   * Get balance for a specific token
   */
  const getTokenBalance = useCallback(
    (tokenAddress: string): RailgunTokenBalance | undefined => {
      return balances.find((b) => b.tokenAddress.toLowerCase() === tokenAddress.toLowerCase());
    },
    [balances],
  );

  /**
   * Get formatted balance for a specific token
   */
  const getFormattedBalance = useCallback(
    (tokenAddress: string): string => {
      const balance = getTokenBalance(tokenAddress);
      return balance?.balanceFormatted || '0.0';
    },
    [getTokenBalance],
  );

  /**
   * Check if user has sufficient balance
   */
  const hasSufficientBalance = useCallback(
    (tokenAddress: string, requiredAmount: string): boolean => {
      const balance = getTokenBalance(tokenAddress);
      if (!balance) return false;

      try {
        const balanceNum = parseFloat(balance.balanceFormatted);
        const requiredNum = parseFloat(requiredAmount);
        return balanceNum >= requiredNum;
      } catch {
        return false;
      }
    },
    [getTokenBalance],
  );

  // Auto-fetch when network or wallet changes or provider becomes ready
  useEffect(() => {
    if (!isReady || !activeWallet || !chainId) {
      return;
    }

    const network = getNetworkForChain(chainId);
    if (!network) {
      return;
    }

    // If provider is ready, fetch immediately
    if (isProviderReady && isProviderLoaded(network)) {
      fetchBalances(false);
      return;
    }

    // Provider not ready yet - poll until it's ready (with timeout)
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max

    const checkAndFetch = () => {
      if (cancelled) return;
      attempts++;

      if (isProviderLoaded(network)) {
        fetchBalances(true); // Force refresh since we waited
        return;
      }

      if (attempts < maxAttempts) {
        setTimeout(checkAndFetch, 1000);
      } else {
        console.warn('[useRailgunBalance] Timeout waiting for provider to load');
      }
    };

    // Start checking after a small delay
    const timeoutId = setTimeout(checkAndFetch, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [chainId, activeWallet?.id, isReady, isProviderReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to balance update callbacks from RAILGUN SDK
  // Disabled - SDK fires too many events causing rate limits
  // Balance will refresh on manual action (shield/unshield/transfer)
  /*
  useEffect(() => {
    if (!isReady || !activeWallet || !chainId) {
      return;
    }

    const network = getNetworkForChain(chainId);
    if (!network) {
      return;
    }

    const unsubscribe = onBalanceUpdate((walletId, updatedNetwork) => {
      // Only refresh if this is our wallet and network
      if (walletId === activeWallet.id && updatedNetwork === network) {
        fetchBalances(true);
      }
    });

    return unsubscribe;
  }, [activeWallet?.id, isReady, chainId, fetchBalances]);
  */

  return {
    balances,
    isLoading,
    error,
    fetchBalances,
    getTokenBalance,
    getFormattedBalance,
    hasSufficientBalance,
    hasPrivateWallet: !!activeWallet,
  };
}

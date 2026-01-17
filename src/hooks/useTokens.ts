'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getTokens, getNativeToken, type Token, type TokensResponse } from '@/services/tokens';
import { useApiHealth } from './useApiHealth';

const TOKENS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 300;

// Simple cache for tokens
const tokenCache = new Map<string, { data: Token[]; timestamp: number; hasMore: boolean }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(chainId: number, search: string): string {
  return `${chainId}-${search}`;
}

export interface UseTokensReturn {
  tokens: Token[];
  nativeToken: Token | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  search: string;
  setSearch: (search: string) => void;
  loadMore: () => void;
  refresh: () => void;
}

export function useTokens(chainId: number): UseTokensReturn {
  const { isHealthy } = useApiHealth();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [nativeToken, setNativeToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearchState] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  // Track if a load more request is in progress
  const loadingMoreRef = useRef(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset page when search changes
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search]);

  // Reset when chain changes
  useEffect(() => {
    setTokens([]);
    setNativeToken(null);
    setPage(1);
    setSearchState('');
    setDebouncedSearch('');
    setHasMore(true);
    setError(null);
    loadingMoreRef.current = false;
  }, [chainId]);

  // Fetch native token
  useEffect(() => {
    let mounted = true;

    async function fetchNativeToken() {
      // Don't try to fetch if API is not healthy
      if (isHealthy === false) {
        return;
      }

      try {
        const native = await getNativeToken(chainId);
        if (mounted) {
          setNativeToken(native);
        }
      } catch (err) {
        // Silently fail for native token - it's not critical
        if (mounted && err instanceof Error && !err.message.includes('API server')) {
          console.warn('Failed to fetch native token:', err.message);
        }
      }
    }

    fetchNativeToken();

    return () => {
      mounted = false;
    };
  }, [chainId, isHealthy]);

  // Fetch tokens (first page only)
  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    async function fetchFirstPage() {
      // Don't try to fetch if API is not healthy
      if (isHealthy === false) {
        setLoading(false);
        setError('Unable to connect to API server. Please ensure the backend is running.');
        return;
      }

      const cacheKey = getCacheKey(chainId, debouncedSearch);

      // Check cache
      if (!debouncedSearch) {
        const cached = tokenCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          setTokens(cached.data);
          setHasMore(cached.hasMore);
          setLoading(false);
          setError(null);
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const response: TokensResponse = await getTokens(
          {
            chainId,
            page: 1,
            limit: TOKENS_PER_PAGE,
            search: debouncedSearch || undefined,
          },
          controller.signal,
        );

        if (!mounted) return;

        setTokens(response.tokens);
        setHasMore(response.hasMore);

        // Cache first page without search
        if (!debouncedSearch) {
          tokenCache.set(cacheKey, {
            data: response.tokens,
            hasMore: response.hasMore,
            timestamp: Date.now(),
          });
        }
      } catch (err) {
        if (!mounted) return;
        if (err instanceof Error && err.name === 'AbortError') return;

        // Don't log API connection errors - maintenance page will handle it
        if (err instanceof Error && !err.message.includes('API server')) {
          console.warn('Failed to fetch tokens:', err.message);
        }
        setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchFirstPage();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [chainId, debouncedSearch, isHealthy]);

  // Load more tokens (separate from first page to avoid race conditions)
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || loading) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);

    const nextPage = page + 1;

    try {
      const response: TokensResponse = await getTokens({
        chainId,
        page: nextPage,
        limit: TOKENS_PER_PAGE,
        search: debouncedSearch || undefined,
      });

      setTokens((prev) => [...prev, ...response.tokens]);
      setHasMore(response.hasMore);
      setPage(nextPage);
    } catch (err) {
      console.error('Failed to load more tokens:', err);
      setError(err instanceof Error ? err.message : 'Failed to load more tokens');
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [chainId, page, debouncedSearch, hasMore, loading]);

  // Set search with reset
  const setSearch = useCallback((value: string) => {
    setSearchState(value);
  }, []);

  // Refresh tokens
  const refresh = useCallback(() => {
    const cacheKey = getCacheKey(chainId, '');
    tokenCache.delete(cacheKey);
    setPage(1);
    setTokens([]);
    setHasMore(true);
    setError(null);
  }, [chainId]);

  return {
    tokens,
    nativeToken,
    loading,
    loadingMore,
    error,
    hasMore,
    search,
    setSearch,
    loadMore,
    refresh,
  };
}

'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { HiChevronDown, HiLockClosed } from 'react-icons/hi2';
import { useTokens } from '@/hooks/useTokens';
import { useRailgun } from '@/providers/RailgunProvider';
import { getNetworkForChain, getWethAddress, isNativeToken } from '@/services/railgun';
import type { Token } from '@/services/tokens';

interface TokenSelectorProps {
  token: Token | null;
  chainId: number;
  onSelect: (token: Token) => void;
  otherToken?: Token | null;
  placeholder?: string;
  hideNativeTokens?: boolean; // Hide native tokens (ETH, MATIC, BNB) - for private swaps where only wrapped versions work
  disabled?: boolean; // Disable token selection (e.g., when wallet is locked)
}

// Helper to truncate address like 0x7169...BA06
function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function TokenSelector({
  token,
  chainId,
  onSelect,
  otherToken: _otherToken,
  placeholder = 'Select',
  hideNativeTokens = false,
  disabled = false,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Get shielded balances from context
  const { getFormattedShieldedBalance, wallet, isReady } = useRailgun();
  const hasPrivateWallet = !!wallet && isReady;

  // Calculate dropdown position when opening and on resize
  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownTop(rect.bottom + 8); // 8px gap
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [isOpen]);

  const { tokens, loading, loadingMore, hasMore, search, setSearch, loadMore, error } =
    useTokens(chainId);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen, setSearch]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!listRef.current || loadingMore || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    // Load more when scrolled to 80% of the list
    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      loadMore();
    }
  }, [loadMore, loadingMore, hasMore]);

  // Helper to get shielded balance for a token (handles native -> WETH conversion)
  const getTokenBalance = useCallback((t: Token): number => {
    if (!hasPrivateWallet) return 0;

    // Native tokens are stored as WETH in RAILGUN
    if (isNativeToken(t.address)) {
      const network = getNetworkForChain(chainId);
      if (network) {
        const wethAddress = getWethAddress(network);
        if (wethAddress) {
          return parseFloat(getFormattedShieldedBalance(wethAddress, t.decimals));
        }
      }
      return 0;
    }

    return parseFloat(getFormattedShieldedBalance(t.address, t.decimals));
  }, [hasPrivateWallet, chainId, getFormattedShieldedBalance]);

  // Filter and sort tokens - show tokens with balance first
  const filteredTokens = useMemo(() => {
    let filtered = tokens.filter((t) => {
      // Optionally filter out native tokens (for private swaps)
      if (hideNativeTokens && t.isNative) return false;
      return true;
    });

    // Sort: tokens with balance first, then popular, then alphabetically
    if (hasPrivateWallet) {
      filtered = filtered.sort((a, b) => {
        const balanceA = getTokenBalance(a);
        const balanceB = getTokenBalance(b);

        // Tokens with balance come first
        if (balanceA > 0 && balanceB <= 0) return -1;
        if (balanceB > 0 && balanceA <= 0) return 1;

        // Both have balance: sort by balance amount
        if (balanceA > 0 && balanceB > 0) {
          return balanceB - balanceA;
        }

        // Neither has balance: popular first, then alphabetically
        if (a.isPopular && !b.isPopular) return -1;
        if (b.isPopular && !a.isPopular) return 1;
        return a.symbol.localeCompare(b.symbol);
      });
    }

    return filtered;
  }, [tokens, hideNativeTokens, hasPrivateWallet, getTokenBalance]);

  return (
    <div ref={ref} className={`relative shrink-0 ${isOpen ? 'z-50' : ''}`}>
      <button
        ref={buttonRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`h-12 flex items-center gap-2 px-4 rounded-xl font-medium transition-colors whitespace-nowrap ${
          disabled
            ? 'bg-void-gray text-void-muted cursor-not-allowed opacity-60'
            : token
              ? 'bg-void-light hover:bg-void-border text-void-white'
              : 'bg-void-accent hover:bg-void-accent-hover text-void-black'
        }`}
      >
        {token ? (
          <>
            {token.logo ? (
              <Image
                src={token.logo}
                alt={token.symbol}
                width={24}
                height={24}
                className="rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-6 h-6 bg-void-gray rounded-full flex items-center justify-center text-sm font-bold text-void-accent">
                {token.symbol.charAt(0)}
              </div>
            )}
            <span>{token.symbol}</span>
          </>
        ) : (
          <span>{placeholder}</span>
        )}
        <HiChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 bg-black/50 z-40 sm:hidden" onClick={() => setIsOpen(false)} />

          {/* Mobile dropdown */}
          <div
            className={`fixed inset-x-4 z-50 sm:hidden bg-void-dark border border-void-border rounded-2xl shadow-2xl overflow-hidden transition-opacity duration-150 ${dropdownTop > 0 ? 'opacity-100' : 'opacity-0'}`}
            style={{ top: dropdownTop || 0 }}
          >
          {/* Search */}
          <div className="p-3 border-b border-void-border">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or paste address"
              className="w-full px-3 py-2 bg-void-gray rounded-xl text-sm text-void-white placeholder:text-void-muted focus:outline-none focus:ring-1 focus:ring-void-accent"
              autoFocus
            />
          </div>

          {/* Token List */}
          <div ref={listRef} onScroll={handleScroll} className="max-h-72 overflow-y-auto">
            {loading ? (
              <div className="p-2 space-y-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
                    <div className="w-8 h-8 bg-void-gray rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-20 bg-void-gray rounded" />
                      <div className="h-3 w-32 bg-void-gray rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error && filteredTokens.length === 0 ? (
              <div className="p-4 text-center">
                <div className="text-red-400 text-sm mb-2">{error}</div>
                <div className="text-void-muted text-xs">
                  {error.includes('API server')
                    ? 'Make sure the backend is running on port 3013'
                    : 'Please try again'}
                </div>
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="p-4 text-center text-void-muted text-sm">
                {search ? 'No tokens found' : 'No tokens available'}
              </div>
            ) : (
              <>
                {filteredTokens.map((t) => {
                  const balance = getTokenBalance(t);
                  return (
                    <button
                      key={`mobile-${t.symbol}-${t.address}`}
                      onClick={() => {
                        onSelect(t);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-void-gray transition-colors ${
                        token?.symbol === t.symbol ? 'bg-void-gray' : ''
                      }`}
                    >
                      {t.logo ? (
                        <div className="relative w-8 h-8">
                          <Image
                            src={t.logo}
                            alt={t.symbol}
                            width={32}
                            height={32}
                            className="rounded-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const fallback = (e.target as HTMLImageElement).nextElementSibling;
                              if (fallback) (fallback as HTMLElement).style.display = 'flex';
                            }}
                          />
                          <div className="absolute inset-0 w-8 h-8 bg-void-light rounded-full items-center justify-center text-sm font-bold text-void-accent hidden">
                            {t.symbol.charAt(0)}
                          </div>
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-void-light rounded-full flex items-center justify-center text-sm font-bold text-void-accent">
                          {t.symbol.charAt(0)}
                        </div>
                      )}
                      <div className="text-left flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-void-white">{t.name}</span>
                          {t.isNative && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-void-accent/20 text-void-accent rounded">
                              Native
                            </span>
                          )}
                          {t.isPopular && !t.isNative && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                              Popular
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-void-muted">
                          <span>{t.symbol}</span>
                          <span className="text-void-border">·</span>
                          <span className="font-mono text-xs">{truncateAddress(t.address)}</span>
                        </div>
                      </div>
                      {hasPrivateWallet && balance > 0 && (
                        <div className="flex items-center gap-1 text-sm text-void-accent shrink-0">
                          <HiLockClosed className="w-3 h-3" />
                          <span>{balance.toFixed(4)}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
                {loadingMore && !error && (
                  <div className="flex items-center justify-center py-3 gap-2 text-void-muted">
                    <div className="w-4 h-4 border-2 border-void-muted border-t-void-accent rounded-full animate-spin" />
                    <span className="text-sm">Loading more...</span>
                  </div>
                )}
                {hasMore && !loadingMore && !error && (
                  <button
                    onClick={loadMore}
                    className="w-full py-3 text-sm text-void-accent hover:bg-void-gray transition-colors"
                  >
                    Load more tokens
                  </button>
                )}
              </>
            )}
          </div>
        </div>

          {/* Desktop dropdown */}
          <div className="max-sm:hidden absolute right-0 top-14 w-96 z-[9999] bg-void-dark border border-void-border rounded-2xl shadow-2xl">
          {/* Search */}
          <div className="p-3 border-b border-void-border">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or paste address"
              className="w-full px-3 py-2 bg-void-gray rounded-xl text-sm text-void-white placeholder:text-void-muted focus:outline-none focus:ring-1 focus:ring-void-accent"
              autoFocus
            />
          </div>

          {/* Token List */}
          <div ref={listRef} onScroll={handleScroll} className="max-h-72 overflow-y-auto">
            {loading ? (
              // Initial loading skeleton
              <div className="p-2 space-y-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
                    <div className="w-8 h-8 bg-void-gray rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-4 w-20 bg-void-gray rounded" />
                      <div className="h-3 w-32 bg-void-gray rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error && filteredTokens.length === 0 ? (
              <div className="p-4 text-center">
                <div className="text-red-400 text-sm mb-2">{error}</div>
                <div className="text-void-muted text-xs">
                  {error.includes('API server')
                    ? 'Make sure the backend is running on port 3013'
                    : 'Please try again'}
                </div>
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="p-4 text-center text-void-muted text-sm">
                {search ? 'No tokens found' : 'No tokens available'}
              </div>
            ) : (
              <>
                {filteredTokens.map((t) => {
                  const balance = getTokenBalance(t);
                  return (
                    <button
                      key={`${t.symbol}-${t.address}`}
                      onClick={() => {
                        onSelect(t);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-void-gray transition-colors ${
                        token?.symbol === t.symbol ? 'bg-void-gray' : ''
                      }`}
                    >
                      {t.logo ? (
                        <div className="relative w-8 h-8">
                          <Image
                            src={t.logo}
                            alt={t.symbol}
                            width={32}
                            height={32}
                            className="rounded-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              const fallback = (e.target as HTMLImageElement).nextElementSibling;
                              if (fallback) (fallback as HTMLElement).style.display = 'flex';
                            }}
                          />
                          <div className="absolute inset-0 w-8 h-8 bg-void-light rounded-full items-center justify-center text-sm font-bold text-void-accent hidden">
                            {t.symbol.charAt(0)}
                          </div>
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-void-light rounded-full flex items-center justify-center text-sm font-bold text-void-accent">
                          {t.symbol.charAt(0)}
                        </div>
                      )}
                      <div className="text-left flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-void-white">{t.name}</span>
                          {t.isNative && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-void-accent/20 text-void-accent rounded">
                              Native
                            </span>
                          )}
                          {t.isPopular && !t.isNative && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                              Popular
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-void-muted">
                          <span>{t.symbol}</span>
                          <span className="text-void-border">·</span>
                          <span className="font-mono text-xs">{truncateAddress(t.address)}</span>
                        </div>
                      </div>
                      {hasPrivateWallet && balance > 0 && (
                        <div className="flex items-center gap-1 text-sm text-void-accent shrink-0">
                          <HiLockClosed className="w-3 h-3" />
                          <span>{balance.toFixed(4)}</span>
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Error indicator */}
                {error && (
                  <div className="flex items-center justify-center py-3 gap-2 text-red-400">
                    <span className="text-sm">Failed to load: {error}</span>
                  </div>
                )}

                {/* Loading more indicator */}
                {loadingMore && !error && (
                  <div className="flex items-center justify-center py-3 gap-2 text-void-muted">
                    <div className="w-4 h-4 border-2 border-void-muted border-t-void-accent rounded-full animate-spin" />
                    <span className="text-sm">Loading more...</span>
                  </div>
                )}

                {/* Load more button (backup for scroll) */}
                {hasMore && !loadingMore && !error && (
                  <button
                    onClick={loadMore}
                    className="w-full py-3 text-sm text-void-accent hover:bg-void-gray transition-colors"
                  >
                    Load more tokens
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        </>
      )}
    </div>
  );
}

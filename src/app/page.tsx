'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import toast from 'react-hot-toast';
import { getErrorMessage, isUserRejectionError } from '@/lib/errorParser';
import {
  HiLockClosed,
  HiArrowsUpDown,
  HiChevronDown,
  HiChevronRight,
  HiAdjustmentsHorizontal,
} from 'react-icons/hi2';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { TokenSelector } from '@/components/swap/TokenSelector';
import { SwapSettings } from '@/components/swap/SwapSettings';
import { SwapDetails } from '@/components/swap/SwapDetails';
import { RouteModal } from '@/components/swap/RouteModal';
import { SwapSuccessModal } from '@/components/swap/SwapSuccessModal';
import { OnboardingModal } from '@/components/onboarding';
import { RailgunWalletModal } from '@/components/wallet/RailgunWalletModal';
import { ShieldModal } from '@/components/wallet/ShieldModal';
import { SetupView } from '@/components/wallet/railgun/views/SetupView';
import { MaintenancePage } from '@/components/maintenance/MaintenancePage';
import { useAuth } from '@/hooks/useAuth';
import { getQuote } from '@/services/quote';
import { usePrivacy } from '@/hooks/usePrivacy';
import { useRailgun } from '@/providers/RailgunProvider';
import { useRailgunSwap } from '@/hooks/useRailgunSwap';
import { useApiHealth } from '@/hooks/useApiHealth';
import { getToken } from '@/services/tokens';
import { getNetworkForChain, getWethAddress, isNativeToken } from '@/services/railgun';
import { getVoidDexRouterAddress } from '@/constants/contracts';
import { useFeeSettings } from '@/providers/FeeSettingsProvider';
import { parseUnits, keccak256, toHex, encodeAbiParameters } from 'viem';
import type { Token } from '@/services/tokens';
import type { QuoteResponse } from '@/types';

export default function SwapPage() {
  const { isHealthy } = useApiHealth();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { openConnectModal } = useConnectModal();
  const { isRailgunWallet } = usePrivacy();
  const { isAuthenticated, signIn, checkAuth } = useAuth();
  const { selectedFeeToken } = useFeeSettings();

  // Check auth and auto sign-in when wallet connects
  const authChecked = useRef(false);
  useEffect(() => {
    const initAuth = async () => {
      if (isConnected && !authChecked.current) {
        authChecked.current = true;
        const isAuthed = await checkAuth();
        // Auto sign-in if not authenticated
        if (!isAuthed) {
          signIn();
        }
      }
    };
    initAuth();

    if (!isConnected) {
      authChecked.current = false;
    }
  }, [isConnected, checkAuth, signIn]);
  const {
    isReady: isRailgunReady,
    hasWallet,
    status: railgunStatus,
    isInitialized: isRailgunInitialized,
    providerStatus,
    wallet,
    // Shielded balances from global context
    getFormattedShieldedBalance,
    isLoadingBalances: isBalanceLoading,
    refreshShieldedBalances,
  } = useRailgun();

  // Syncing state - disable swap while syncing
  const isSyncing = providerStatus === 'loading';
  const hasPrivateWallet = !!wallet;
  const { executePrivateSwap, isSwapping, progress: swapProgress } = useRailgunSwap();

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showShieldModal, setShowShieldModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [swapResult, setSwapResult] = useState<{
    txHash: string;
    sellAmount: string;
    buyAmount: string;
  } | null>(null);

  // Track if component has mounted (for hydration-safe rendering)
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Only disable UI after client-side mount to avoid hydration mismatch
  const isWalletLocked = hasMounted && hasWallet && !isRailgunReady;

  // Disable swap execution when syncing, wallet locked, or swap in progress
  const isSwapDisabled = isWalletLocked || isSyncing || isSwapping;

  // Token selection should be disabled when wallet is locked or swap in progress
  // Users should be able to select tokens while balances are syncing, but NOT during swap
  const isTokenSelectionDisabled = isWalletLocked || isSwapping;

  // Check if SDK is still loading (initializing or unlocking)
  const isRailgunLoading = !isRailgunInitialized || railgunStatus === 'initializing' || railgunStatus === 'unlocking';

  // Close onboarding modal only when wallet is ready (unlocked)
  useEffect(() => {
    if (isRailgunReady && showOnboarding) {
      setShowOnboarding(false);
    }
  }, [isRailgunReady, showOnboarding]);

  // Close wallet modal when wallet is unlocked
  useEffect(() => {
    if (isRailgunReady && showWalletModal) {
      setShowWalletModal(false);
    }
  }, [isRailgunReady, showWalletModal]);

  const [sellToken, setSellToken] = useState<Token | null>(null);
  const [buyToken, setBuyToken] = useState<Token | null>(null);
  const [sellAmount, setSellAmount] = useState('');
  const [buyAmount, setBuyAmount] = useState('');
  const [lastEditedField, setLastEditedField] = useState<'sell' | 'buy'>('sell');
  const [quoteInputAmount, setQuoteInputAmount] = useState(''); // Tracks the amount used to trigger quote

  // Fetch WETH as default token on chain change (for private swaps, we use wrapped tokens)
  useEffect(() => {
    let mounted = true;

    async function fetchDefaultToken() {
      // Don't try to fetch if API is not healthy
      if (isHealthy === false) {
        return;
      }

      try {
        // Get WETH address for this network
        const network = getNetworkForChain(chainId || 1);
        const wethAddress = network ? getWethAddress(network) : null;

        if (wethAddress) {
          // Try to fetch WETH token info
          const weth = await getToken(chainId || 1, wethAddress);
          if (mounted && weth) {
            setSellToken(weth);
            setBuyToken(null);
            setSellAmount('');
            setBuyAmount('');
          }
        }
      } catch (err) {
        // Silently fail - if API is down, maintenance page will show
        if (mounted && err instanceof Error && !err.message.includes('API server')) {
          console.warn('Failed to fetch WETH token:', err.message);
        }
        // Fallback - create a basic WETH token
        const network = getNetworkForChain(chainId || 1);
        const wethAddress = network ? getWethAddress(network) : null;
        if (mounted && wethAddress) {
          setSellToken({
            symbol: 'WETH',
            name: 'Wrapped Ether',
            decimals: 18,
            logo: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
            address: wethAddress,
            isNative: false,
            isPopular: true,
          });
        }
      }
    }

    fetchDefaultToken();

    return () => {
      mounted = false;
    };
  }, [chainId, isHealthy]);

  const [slippage, setSlippage] = useState('0.5');
  const [showSettings, setShowSettings] = useState(false);
  const [showSwapDetails, setShowSwapDetails] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);

  // Close modals and details when swap starts (proof generation is CPU intensive)
  useEffect(() => {
    if (isSwapping) {
      setShowSwapDetails(false);
      setShowRouteModal(false);
      setShowSettings(false);
    }
  }, [isSwapping]);

  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSwapTokens = () => {
    if (!sellToken) return;

    const tempToken = sellToken;
    const tempAmount = sellAmount;

    if (buyToken) {
      setSellToken(buyToken);
    }

    setBuyToken(tempToken);
    setSellAmount(buyAmount);
    setBuyAmount(tempAmount);
  };

  // Get the shielded token address for a given token (native tokens become WETH)
  const getShieldedTokenAddress = useCallback(
    (token: Token): string => {
      if (isNativeToken(token.address)) {
        const network = getNetworkForChain(chainId || 1);
        if (network) {
          const wethAddress = getWethAddress(network);
          if (wethAddress) return wethAddress;
        }
      }
      return token.address;
    },
    [chainId],
  );

  // Get formatted balance for sell token (accounting for native -> WETH conversion)
  const sellTokenBalance = useMemo(() => {
    if (!sellToken || !hasPrivateWallet) return '0';
    const shieldedAddress = getShieldedTokenAddress(sellToken);
    return getFormattedShieldedBalance(shieldedAddress, sellToken.decimals);
  }, [sellToken, hasPrivateWallet, getShieldedTokenAddress, getFormattedShieldedBalance]);

  // Get formatted balance for buy token
  const buyTokenBalance = useMemo(() => {
    if (!buyToken || !hasPrivateWallet) return '0';
    const shieldedAddress = getShieldedTokenAddress(buyToken);
    return getFormattedShieldedBalance(shieldedAddress, buyToken.decimals);
  }, [buyToken, hasPrivateWallet, getShieldedTokenAddress, getFormattedShieldedBalance]);

  // Check if user has shielded balance for sell token
  const hasShieldedSellBalance = useMemo(() => {
    if (!sellToken || !hasPrivateWallet || !isRailgunReady) return false;
    return parseFloat(sellTokenBalance) > 0;
  }, [sellToken, hasPrivateWallet, isRailgunReady, sellTokenBalance]);

  // Check if sell amount exceeds balance
  const isInsufficientBalance = useMemo(() => {
    if (!sellAmount || !hasShieldedSellBalance) return false;
    const amount = parseFloat(sellAmount);
    const balance = parseFloat(sellTokenBalance);
    return amount > balance;
  }, [sellAmount, sellTokenBalance, hasShieldedSellBalance]);

  // Update quoteInputAmount when user edits an input field
  useEffect(() => {
    const amount = lastEditedField === 'sell' ? sellAmount : buyAmount;
    setQuoteInputAmount(amount);
  }, [sellAmount, buyAmount, lastEditedField]);

  // Fetch quote from API (only when user has shielded balance and amount is valid)
  useEffect(() => {
    const fetchQuote = async () => {
      // Determine which amount to use based on last edited field
      const isExactInput = lastEditedField === 'sell';

      if (!sellToken || !buyToken || !quoteInputAmount || parseFloat(quoteInputAmount) <= 0 || !hasShieldedSellBalance) {
        setQuote(null);
        setError(null);
        return;
      }

      // For exactInput, check insufficient balance
      if (isExactInput && isInsufficientBalance) {
        setQuote(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await getQuote({
          chainId: chainId || 1,
          fromToken: sellToken.address,
          toToken: buyToken.address,
          fromTokenSymbol: sellToken.symbol,
          toTokenSymbol: buyToken.symbol,
          amount: quoteInputAmount,
          slippage: parseFloat(slippage),
          type: isExactInput ? 'exactInput' : 'exactOutput',
        });

        setQuote(response);

        // Update the other field based on response (without triggering another quote fetch)
        if (isExactInput) {
          setBuyAmount(response.toAmount);
        } else {
          setSellAmount(response.fromAmount);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get quote';
        setError(errorMessage);
        setQuote(null);

        if (errorMessage.includes('Cannot GET') || errorMessage.includes('fetch')) {
          toast.error('Unable to connect to the server. Please try again later.');
        } else if (errorMessage.includes('rate limit')) {
          toast.error('Too many requests. Please wait a moment.');
        } else if (errorMessage.includes('timeout')) {
          toast.error('Request timed out. Check your connection.');
        } else if (errorMessage.includes('Pool price') || errorMessage.includes('extremely off') || errorMessage.includes('Insufficient liquidity')) {
          toast.error('Insufficient liquidity for this pair. Try a different pair.');
        } else if (errorMessage.includes('No quotes available')) {
          toast.error('No liquidity available for this pair.');
        } else {
          toast.error(errorMessage || 'Failed to get quote. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchQuote, 500);
    return () => clearTimeout(debounce);
  }, [quoteInputAmount, lastEditedField, sellToken, buyToken, chainId, slippage, hasShieldedSellBalance, isInsufficientBalance]);

  const handleMaxClick = () => {
    // Only use private wallet balances - no public wallet trading
    if (hasPrivateWallet && sellToken) {
      const balance = parseFloat(sellTokenBalance);
      const safeMax = Math.max(0, balance - 0.001).toFixed(6);
      setSellAmount(safeMax);
      setLastEditedField('sell');
    }
  };

  // Only allow swaps with private wallet - no public wallet trading
  const canSwap =
    isConnected &&
    isRailgunReady &&
    hasPrivateWallet &&
    sellAmount &&
    buyToken &&
    parseFloat(sellAmount) > 0 &&
    !isInsufficientBalance &&
    quote;

  // Show maintenance page if API is not healthy
  if (isHealthy === false) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header apiHealthy={false} />
        <MaintenancePage />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header apiHealthy={isHealthy ?? true} />

      <main className="flex-1 px-4 py-10 flex items-center justify-center">
        <div className="w-full max-w-[420px]">
          {/* Slogan */}
          <div className="text-center mb-10 flex flex-col gap-2">
            <h1 className="!text-3xl sm:!text-4xl font-normal text-void-white">
              Trade private,
            </h1>
            <h1 className="!text-3xl sm:!text-4xl font-normal text-void-white">
              stay invisible.
            </h1>
          </div>

          {/* Swap Card */}
          <div className="bg-void-dark border border-void-border rounded-2xl p-4 overflow-visible">
            {/* Syncing Banner */}
            {isSyncing && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-void-accent/10 rounded-xl text-void-accent text-sm">
                <div className="w-4 h-4 border-2 border-void-accent border-t-transparent rounded-full animate-spin" />
                <span>Syncing private balances...</span>
              </div>
            )}

            {/* Sell Input */}
            <div
              className={`bg-void-gray rounded-xl p-4 overflow-visible ${isTokenSelectionDisabled ? 'opacity-60' : ''}`}
            >
              {/* Mobile: Label + Token row */}
              <div className="flex items-center justify-between gap-3 sm:hidden">
                <span className="text-sm text-void-muted">Sell</span>
                <TokenSelector
                  token={sellToken}
                  chainId={chainId || 1}
                  onSelect={(token) => {
                    if (buyToken && token.symbol === buyToken.symbol) {
                      handleSwapTokens();
                    } else {
                      setSellToken(token);
                    }
                  }}
                  otherToken={buyToken}
                  hideNativeTokens={true}
                  disabled={isTokenSelectionDisabled}
                />
              </div>
              {/* Desktop: Side by side layout */}
              <div className="max-sm:hidden flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-void-muted">Sell</span>
                  <input
                    type="text"
                    value={sellAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setSellAmount(val);
                        setLastEditedField('sell');
                      }
                    }}
                    disabled={isSwapDisabled || (isRailgunReady && !hasShieldedSellBalance)}
                    placeholder="0"
                    className={`w-full bg-transparent text-3xl font-medium placeholder:text-void-muted focus:outline-none mt-1 ${isSwapDisabled || (isRailgunReady && !hasShieldedSellBalance) ? 'cursor-not-allowed text-void-muted' : 'text-void-white'} ${isInsufficientBalance ? 'text-red-400' : ''}`}
                  />
                  {isConnected &&
                    sellToken &&
                    isRailgunReady &&
                    (() => {
                      if (isBalanceLoading) {
                        return (
                          <div className="text-sm text-void-muted mt-1 flex items-center gap-1.5 whitespace-nowrap">
                            <span className="w-3 h-3 border border-void-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
                            <span>Syncing private balance...</span>
                          </div>
                        );
                      }
                      const balance = parseFloat(sellTokenBalance);
                      return (
                        <button
                          onClick={handleMaxClick}
                          disabled={balance <= 0}
                          className={`text-sm transition-colors mt-1 flex items-center gap-1 ${balance > 0 ? 'text-void-accent hover:text-void-accent-hover' : 'text-void-muted cursor-default'}`}
                        >
                          <HiLockClosed className="w-4 h-4" />
                          <span className="text-void-muted">Balance:</span> {balance.toFixed(4)} {sellToken.symbol}
                        </button>
                      );
                    })()}
                </div>
                <TokenSelector
                  token={sellToken}
                  chainId={chainId || 1}
                  onSelect={(token) => {
                    if (buyToken && token.symbol === buyToken.symbol) {
                      handleSwapTokens();
                    } else {
                      setSellToken(token);
                    }
                  }}
                  otherToken={buyToken}
                  hideNativeTokens={true}
                  disabled={isTokenSelectionDisabled}
                />
              </div>
              {/* Mobile: Input below */}
              <div className="sm:hidden mt-2">
                <input
                  type="text"
                  value={sellAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setSellAmount(val);
                      setLastEditedField('sell');
                    }
                  }}
                  disabled={isSwapDisabled || (isRailgunReady && !hasShieldedSellBalance)}
                  placeholder="0"
                  className={`w-full bg-transparent text-4xl font-medium placeholder:text-void-muted focus:outline-none ${isSwapDisabled || (isRailgunReady && !hasShieldedSellBalance) ? 'cursor-not-allowed text-void-muted' : 'text-void-white'} ${isInsufficientBalance ? 'text-red-400' : ''}`}
                />
                {isConnected &&
                  sellToken &&
                  isRailgunReady &&
                  (() => {
                    if (isBalanceLoading) {
                      return (
                        <div className="text-sm text-void-muted mt-2 flex items-center gap-1.5">
                          <span className="w-3 h-3 border border-void-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
                          <span>Syncing...</span>
                        </div>
                      );
                    }
                    const balance = parseFloat(sellTokenBalance);
                    return (
                      <button
                        onClick={handleMaxClick}
                        disabled={balance <= 0}
                        className={`text-sm transition-colors mt-2 flex items-center gap-1 ${balance > 0 ? 'text-void-accent hover:text-void-accent-hover' : 'text-void-muted cursor-default'}`}
                      >
                        <HiLockClosed className="w-4 h-4" />
                        <span className="text-void-muted">Balance:</span> {balance.toFixed(4)} {sellToken.symbol}
                      </button>
                    );
                  })()}
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="flex justify-center -my-3.5 relative z-10">
              <button
                onClick={handleSwapTokens}
                disabled={isSwapDisabled}
                className={`w-10 h-10 bg-void-gray border-4 border-void-dark rounded-xl flex items-center justify-center transition-all ${
                  isSwapDisabled
                    ? 'text-void-muted cursor-not-allowed opacity-60'
                    : 'text-void-muted hover:text-void-accent hover:bg-void-light active:scale-90 cursor-pointer'
                }`}
              >
                <HiArrowsUpDown className="w-4 h-4" />
              </button>
            </div>

            {/* Buy Input */}
            <div
              className={`bg-void-gray rounded-xl p-4 overflow-visible ${isTokenSelectionDisabled ? 'opacity-60' : ''}`}
            >
              {/* Mobile: Label + Token row */}
              <div className="flex items-center justify-between gap-3 sm:hidden">
                <span className="text-sm text-void-muted">Buy</span>
                <TokenSelector
                  token={buyToken}
                  chainId={chainId || 1}
                  onSelect={(token) => {
                    if (sellToken && token.symbol === sellToken.symbol) {
                      handleSwapTokens();
                    } else {
                      setBuyToken(token);
                    }
                  }}
                  otherToken={sellToken}
                  placeholder="Select"
                  hideNativeTokens={true}
                  disabled={isTokenSelectionDisabled || !hasShieldedSellBalance}
                />
              </div>
              {/* Desktop: Side by side layout */}
              <div className="max-sm:hidden flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-void-muted">Buy</span>
                  <input
                    type="text"
                    value={buyAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setBuyAmount(val);
                        setLastEditedField('buy');
                      }
                    }}
                    disabled={isSwapDisabled || !hasShieldedSellBalance || !buyToken}
                    placeholder="0"
                    className={`w-full bg-transparent text-3xl font-medium placeholder:text-void-muted focus:outline-none mt-1 ${isSwapDisabled || !hasShieldedSellBalance || !buyToken ? 'cursor-not-allowed text-void-muted' : 'text-void-white'}`}
                  />
                </div>
                <TokenSelector
                  token={buyToken}
                  chainId={chainId || 1}
                  onSelect={(token) => {
                    if (sellToken && token.symbol === sellToken.symbol) {
                      handleSwapTokens();
                    } else {
                      setBuyToken(token);
                    }
                  }}
                  otherToken={sellToken}
                  placeholder="Select"
                  hideNativeTokens={true}
                  disabled={isTokenSelectionDisabled || !hasShieldedSellBalance}
                />
              </div>
              {/* Mobile: Input below */}
              <div className="sm:hidden mt-2">
                <input
                  type="text"
                  value={buyAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setBuyAmount(val);
                      setLastEditedField('buy');
                    }
                  }}
                  disabled={isSwapDisabled || !hasShieldedSellBalance || !buyToken}
                  placeholder="0"
                  className={`w-full bg-transparent text-4xl font-medium placeholder:text-void-muted focus:outline-none ${isSwapDisabled || !hasShieldedSellBalance || !buyToken ? 'cursor-not-allowed text-void-muted' : 'text-void-white'}`}
                />
              </div>
              {/* Buy token balance display */}
              {buyToken && hasPrivateWallet && parseFloat(buyTokenBalance) > 0 && (
                <div className="flex items-center gap-1.5 mt-2 text-sm text-void-muted">
                  <HiLockClosed className="w-3.5 h-3.5" />
                  <span>Balance: {parseFloat(buyTokenBalance).toFixed(4)} {buyToken.symbol}</span>
                </div>
              )}
            </div>

            {/* Swap Details */}
            {quote && (
              <SwapDetails
                quote={quote}
                sellAmount={sellAmount}
                sellToken={sellToken}
                buyToken={buyToken}
                chainId={chainId || 1}
                isPrivateSwap={hasPrivateWallet && isRailgunReady}
                isOpen={showSwapDetails}
                onToggle={() => setShowSwapDetails(!showSwapDetails)}
                disabled={isSwapping}
              />
            )}

            {/* Route Info */}
            {sellAmount && buyToken && (loading || error || quote) && (
              <button
                onClick={() => quote && setShowRouteModal(true)}
                disabled={loading || !quote || isSwapping}
                className="w-full mt-3 px-4 py-3 bg-void-gray hover:bg-void-light rounded-xl transition-colors text-left disabled:cursor-default disabled:hover:bg-void-gray"
              >
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-void-muted">
                    <div className="w-3 h-3 border-2 border-void-muted border-t-void-accent rounded-full animate-spin" />
                    Finding best route...
                  </div>
                ) : error ? (
                  <div className="flex items-center gap-2 text-sm text-void-muted">
                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                    <span>Route unavailable</span>
                  </div>
                ) : quote ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-void-success rounded-full animate-pulse" />
                      <span className="text-sm text-void-white font-medium">Best Route Found</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isRailgunWallet && (
                        <span className="text-xs px-1.5 py-0.5 bg-void-success/20 text-void-success rounded font-medium">
                          Private
                        </span>
                      )}
                      <HiChevronRight className="w-4 h-4 text-void-muted" />
                    </div>
                  </div>
                ) : null}
              </button>
            )}

            {/* Settings Toggle */}
            <button
              onClick={() => !isSwapDisabled && hasShieldedSellBalance && setShowSettings(!showSettings)}
              disabled={isTokenSelectionDisabled || !hasShieldedSellBalance}
              className={`w-full mt-3 flex items-center justify-between gap-2 px-4 py-3 rounded-xl transition-colors ${
                isSwapDisabled || !hasShieldedSellBalance
                  ? 'bg-void-gray text-void-muted cursor-not-allowed opacity-60'
                  : showSettings
                    ? 'bg-void-light text-void-white'
                    : 'bg-void-gray hover:bg-void-light text-void-muted hover:text-void-text'
              }`}
            >
              <div className="flex items-center gap-2 shrink-0">
                <HiAdjustmentsHorizontal className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">Settings</span>
              </div>
              <div className="flex items-center gap-3 text-sm whitespace-nowrap">
                <span>{slippage}% slippage</span>
                <span className="text-void-muted">•</span>
                <span>Fee: {selectedFeeToken?.symbol || 'WETH'}</span>
                <HiChevronDown
                  className={`w-4 h-4 shrink-0 transition-transform duration-200 ${showSettings ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            {/* Settings Panel */}
            <div
              className={`overflow-visible transition-all duration-200 ease-out ${
                showSettings && !isSwapDisabled && hasShieldedSellBalance ? 'max-h-[300px] opacity-100 mt-3' : 'max-h-0 opacity-0 overflow-hidden'
              }`}
            >
              <SwapSettings slippage={slippage} setSlippage={setSlippage} />
            </div>

            {/* Swap Progress */}
            {isSwapping && swapProgress && (
              <div className="mt-3 p-4 bg-void-gray rounded-xl space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-void-muted">{swapProgress.status}</span>
                  <span className="text-void-accent">{swapProgress.percent.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-void-dark rounded-full overflow-hidden">
                  <div
                    className="h-full bg-void-accent transition-all duration-300 ease-out"
                    style={{ width: `${swapProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Swap Button */}
            <button
              disabled={
                isSwapping ||
                (isConnected && hasWallet && !isRailgunReady && isRailgunLoading) ||
                (isConnected && hasWallet && isRailgunReady && (isSyncing || isBalanceLoading)) ||
                (isConnected && hasWallet && isRailgunReady && hasShieldedSellBalance && !canSwap) ||
                isInsufficientBalance
              }
              onClick={async () => {
                if (!isConnected) {
                  openConnectModal?.();
                  return;
                }

                if (!hasWallet) {
                  setShowOnboarding(true);
                  return;
                }

                if (hasWallet && !isRailgunReady && !isRailgunLoading) {
                  setShowWalletModal(true);
                  return;
                }

                // Open shield modal if no shielded balance
                if (isRailgunReady && !hasShieldedSellBalance) {
                  setShowShieldModal(true);
                  return;
                }

                if (canSwap && sellToken && buyToken && quote) {
                  // Sign in if not authenticated (required for API access)
                  if (!isAuthenticated) {
                    try {
                      await signIn();
                    } catch {
                      return; // User cancelled or error
                    }
                  }

                  // Execute private swap via Railgun
                  try {
                    const routerAddress = getVoidDexRouterAddress(chainId || 1);
                    if (!routerAddress) {
                      toast.error('VoidDex Router not available on this network');
                      return;
                    }

                    // Detect if this is a sequential multi-hop swap (A->B->C)
                    // Sequential: multiple steps where output of one feeds into next
                    // Split: single step with multiple DEXes (handled by percentage)
                    const isSequentialSwap = quote.route.steps.length > 1 &&
                      quote.route.steps.every(step => step.percentage === 100);

                    // Parse amounts with proper decimals
                    const amountInWei = parseUnits(sellAmount, sellToken.decimals).toString();
                    const minAmountOutWei = parseUnits(
                      quote.meta.minReceived.split(' ')[0], // Remove token symbol
                      buyToken.decimals
                    ).toString();

                    if (isSequentialSwap) {
                      // Sequential multi-hop swap (A->B->C)
                      const sequentialSteps = quote.route.steps.map((step, index) => {
                        const dexIdBytes32 = keccak256(toHex(step.dexId));

                        // Get the output token address for this step
                        // path contains addresses: [tokenIn, tokenOut]
                        const tokenOutAddress = step.path?.[step.path.length - 1] || buyToken.address;

                        // Generate dexData for this hop
                        let dexData = step.dexData;
                        if (!dexData || dexData === '0x' || dexData === '') {
                          const fee = step.feeTier || 3000;
                          const innerEncoded = encodeAbiParameters(
                            [{ type: 'uint24' }],
                            [fee]
                          );
                          dexData = encodeAbiParameters(
                            [{ type: 'bool' }, { type: 'bytes' }],
                            [false, innerEncoded]
                          );
                        }

                        return {
                          dexId: dexIdBytes32,
                          tokenOut: tokenOutAddress,
                          minAmountOut: '0', // Final minAmountOut protects overall swap
                          dexData,
                        };
                      });

                      const txHash = await executePrivateSwap({
                        tokenIn: sellToken.address,
                        tokenOut: buyToken.address,
                        amountIn: amountInWei,
                        minAmountOut: minAmountOutWei,
                        routes: [], // Not used for sequential
                        sequentialSteps,
                        isSequential: true,
                        voidDexRouterAddress: routerAddress,
                      });

                      // Show success modal
                      setSwapResult({
                        txHash,
                        sellAmount,
                        buyAmount: quote.toAmount,
                      });
                      setShowSuccessModal(true);
                    } else {
                      // Split routing (single hop or multiple DEXes with percentages)
                      const routes = quote.route.steps.map((step) => {
                        const dexIdBytes32 = keccak256(toHex(step.dexId));
                        const percentageBps = Math.round(step.percentage * 100);

                        let dexData = step.dexData;
                        if (!dexData || dexData === '0x' || dexData === '') {
                          const fee = step.feeTier || 500;
                          const innerEncoded = encodeAbiParameters(
                            [{ type: 'uint24' }],
                            [fee]
                          );
                          dexData = encodeAbiParameters(
                            [{ type: 'bool' }, { type: 'bytes' }],
                            [false, innerEncoded]
                          );
                        }

                        return {
                          dexId: dexIdBytes32,
                          percentage: percentageBps,
                          minAmountOut: '0',
                          dexData,
                        };
                      });

                      const txHash = await executePrivateSwap({
                        tokenIn: sellToken.address,
                        tokenOut: buyToken.address,
                        amountIn: amountInWei,
                        minAmountOut: minAmountOutWei,
                        routes,
                        voidDexRouterAddress: routerAddress,
                      });

                      // Show success modal
                      setSwapResult({
                        txHash,
                        sellAmount,
                        buyAmount: quote.toAmount,
                      });
                      setShowSuccessModal(true);
                    }

                    setSellAmount('');
                    setBuyAmount('');

                    // Refresh private balances after swap
                    // Small delay to allow merkle tree to sync new UTXOs
                    setTimeout(() => refreshShieldedBalances(true), 2000);
                  } catch (err: unknown) {
                    if (!isUserRejectionError(err)) {
                      toast.error(getErrorMessage(err));
                    }
                  }
                }
              }}
              className="w-full mt-3 py-4 rounded-xl font-semibold text-base transition-all bg-void-accent hover:bg-void-accent-hover text-void-black active:scale-[0.99] cursor-pointer disabled:bg-void-gray disabled:text-void-muted disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {!isConnected
                ? 'Connect Wallet'
                : !hasWallet
                  ? 'Setup Private Wallet'
                  : hasWallet && !isRailgunReady && isRailgunLoading
                    ? 'Initializing...'
                    : hasWallet && !isRailgunReady
                      ? 'Unlock Private Wallet'
                      : isSyncing || isBalanceLoading
                        ? 'Syncing Private Balance...'
                        : isSwapping && swapProgress
                          ? swapProgress.status
                          : isSwapping
                            ? 'Swapping...'
                            : !hasShieldedSellBalance
                              ? 'Shield Tokens to Swap'
                              : !buyToken
                                ? 'Select token'
                                : !sellAmount || parseFloat(sellAmount) <= 0
                                  ? 'Enter amount'
                                  : isInsufficientBalance
                                    ? 'Insufficient balance'
                                    : 'Swap'}
            </button>
          </div>

          {/* Powered by Railgun */}
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-void-muted">
            <span>Powered by</span>
            <a
              href="https://railgun.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <img src="/railgun-logo.svg" alt="Railgun" className="h-5 w-auto" />
            </a>
          </div>
        </div>
      </main>
      <Footer />

      {/* Route Modal */}
      <RouteModal
        isOpen={showRouteModal}
        onClose={() => setShowRouteModal(false)}
        quote={quote}
        isRailgunWallet={isRailgunWallet}
      />

      {/* Success Modal */}
      {sellToken && buyToken && swapResult && (
        <SwapSuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setSwapResult(null);
          }}
          txHash={swapResult.txHash}
          chainId={chainId || 1}
          sellToken={{ symbol: sellToken.symbol, logo: sellToken.logo }}
          buyToken={{ symbol: buyToken.symbol, logo: buyToken.logo }}
          sellAmount={swapResult.sellAmount}
          buyAmount={swapResult.buyAmount}
        />
      )}

      {/* Onboarding Modal */}
      <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />

      {/* Railgun Wallet Modal (for unlock) */}
      <RailgunWalletModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} />

      {/* Shield Modal */}
      <ShieldModal
        isOpen={showShieldModal}
        onClose={() => setShowShieldModal(false)}
        initialToken={sellToken}
      />

      {/* Syncing Overlay */}
      {isSyncing && isRailgunReady && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm mx-4 bg-void-dark border border-void-border rounded-2xl shadow-2xl p-6">
            <SetupView onComplete={() => {}} />
          </div>
        </div>
      )}
    </div>
  );
}

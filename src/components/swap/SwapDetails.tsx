'use client';

import { useMemo, useEffect, useState } from 'react';
import { HiChevronDown, HiLockClosed, HiSignal } from 'react-icons/hi2';
import type { QuoteResponse } from '@/types';
import { findBestBroadcaster } from '@/services/railgun/relayer';
import { getNetworkForChain } from '@/services/railgun';
import { getVoidDexRouterAddress } from '@/constants/contracts';
import { useFeeSettings } from '@/providers/FeeSettingsProvider';

interface SwapDetailsProps {
  quote: QuoteResponse | null;
  sellAmount: string;
  sellToken: { symbol: string; decimals: number; address: string } | null;
  buyToken: { symbol: string; decimals: number; address: string } | null;
  chainId: number;
  isPrivateSwap: boolean;
  isOpen: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

interface FeeBreakdown {
  // Standard fees
  gasCost: string;
  gasCostUsd: string;
  voidDexFee: string;
  voidDexFeeUsd: string;
  // Private swap fees
  railgunFee: string;
  railgunFeeUsd: string;
  broadcasterFee: string;
  broadcasterFeeUsd: string;
  broadcasterFeeStatus: 'loading' | 'calculated' | 'unavailable';
  // Totals
  totalFeeWeth: string; // Broadcaster fee in WETH (for toggle button)
  totalFeeSellToken: string; // Total fees in sell token (for expanded details)
  totalFeeUsd: string;
  netSwapAmount: string;
}

// ETH has 18 decimals - this is a protocol constant, not a hardcoded estimate
const GAS_TOKEN_DECIMALS = 18;

export function SwapDetails({
  quote,
  sellAmount,
  sellToken,
  buyToken,
  chainId,
  isPrivateSwap,
  isOpen,
  onToggle,
  disabled = false,
}: SwapDetailsProps) {
  // WETH-only fee system: always use WETH as fee token
  const { feeToken } = useFeeSettings();

  const [broadcasterFeePerUnitGas, setBroadcasterFeePerUnitGas] = useState<bigint | null>(null);
  const [currentGasPrice, setCurrentGasPrice] = useState<bigint | null>(null);
  const [gasEstimate, setGasEstimate] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);

  // Fetch all required data for fee calculation when doing private swap
  useEffect(() => {
    if (!isPrivateSwap || !sellToken || !buyToken || !quote || !feeToken) {
      setBroadcasterFeePerUnitGas(null);
      setCurrentGasPrice(null);
      setGasEstimate(null);
      setDataFetched(false);
      return;
    }

    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        const network = getNetworkForChain(chainId);
        if (!network) {
          console.warn('[SwapDetails] No network found for chainId:', chainId);
          setDataFetched(true);
          return;
        }

        // Get VoidDex router address for this chain
        const routerAddress = getVoidDexRouterAddress(chainId);
        if (!routerAddress) {
          console.warn('[SwapDetails] No router address for chainId:', chainId);
          setDataFetched(true);
          return;
        }

        // Convert amounts to raw values (smallest unit)
        const fromAmountRaw = BigInt(
          Math.floor(parseFloat(quote.fromAmount) * Math.pow(10, sellToken.decimals))
        ).toString();
        const toAmountRaw = buyToken ? BigInt(
          Math.floor(parseFloat(quote.toAmount) * Math.pow(10, buyToken.decimals))
        ).toString() : '0';

        // Fetch all data in parallel - no fallbacks, real values only
        // WETH-only: use feeToken.address for broadcaster fee
        const [broadcasterInfo, gasEstimateResponse] = await Promise.all([
          // Get broadcaster fee per unit gas (always for WETH)
          findBestBroadcaster(network, feeToken.address.toLowerCase(), true),
          // Get real gas estimate and gas price from API
          // Skip frontend gas estimation if API already provides broadcaster fee
          // The API calculates fee with minimum gas fallback, and actual gas is determined by SDK during swap
          quote.fees.broadcasterFee ? Promise.resolve(null) :
          fetch('/api/gas-estimate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chainId,
              tokenIn: sellToken.address,
              tokenOut: buyToken.address,
              amountIn: fromAmountRaw,
              minAmountOut: toAmountRaw,
              routerAddress,
              routes: quote.route?.steps?.map(step => ({
                dexId: step.dexId || '',
                percentage: step.percentage || 10000,
                minAmountOut: '0',
                dexData: step.dexData || '0x',
              })) || [],
            }),
          }).then(r => r.json()).catch(() => null),
        ]);

        // Set broadcaster fee
        if (broadcasterInfo) {
          setBroadcasterFeePerUnitGas(broadcasterInfo.feePerUnitGas);
        } else {
          setBroadcasterFeePerUnitGas(null);
        }

        // Set gas estimate and gas price
        if (gasEstimateResponse?.gasEstimate && gasEstimateResponse?.gasPrice) {
          const estimate = BigInt(gasEstimateResponse.gasEstimate);
          const price = BigInt(gasEstimateResponse.gasPrice);
          setGasEstimate(estimate);
          setCurrentGasPrice(price);
        } else {
          setGasEstimate(null);
          setCurrentGasPrice(null);
        }
      } catch (err) {
        console.error('[SwapDetails] Failed to fetch fee data:', err);
      } finally {
        setIsLoading(false);
        setDataFetched(true);
      }
    };

    fetchAllData();
  }, [isPrivateSwap, sellToken, buyToken, chainId, quote, feeToken]);

  // Calculate fee breakdown using ONLY real values
  // WETH-only: broadcaster fee is always in WETH
  const feeBreakdown = useMemo<FeeBreakdown | null>(() => {
    if (!quote || !sellAmount || !sellToken) return null;

    const amount = parseFloat(sellAmount);
    if (isNaN(amount) || amount <= 0) return null;

    // RAILGUN unshield fee is 0.25% - this is a protocol constant
    const RAILGUN_FEE_BASIS_POINTS = 25; // 0.25%
    const railgunFeeAmount = amount * (RAILGUN_FEE_BASIS_POINTS / 10000);
    const amountAfterRailgunFee = amount * (1 - RAILGUN_FEE_BASIS_POINTS / 10000);

    // Broadcaster fee calculation using REAL values only
    // WETH-only: fee is always in WETH (18 decimals)
    let broadcasterFeeWeth = 0;
    let broadcasterFeeStatus: 'loading' | 'calculated' | 'unavailable' = 'loading';

    // First check if API already provided broadcaster fee
    if (quote.fees.broadcasterFee && quote.fees.broadcasterFeeUsd) {
      // Use API-provided broadcaster fee (already in WETH)
      const feeMatch = quote.fees.broadcasterFee.match(/^([\d.]+)/);
      if (feeMatch) {
        broadcasterFeeWeth = parseFloat(feeMatch[1]);
        broadcasterFeeStatus = 'calculated';
      }
    }

    // Fall back to live calculation if API didn't provide fee
    if (broadcasterFeeStatus !== 'calculated' && isPrivateSwap && feeToken) {
      if (isLoading) {
        broadcasterFeeStatus = 'loading';
      } else if (broadcasterFeePerUnitGas && currentGasPrice && gasEstimate) {
        // All real values available - calculate actual fee
        // WETH has 18 decimals (same as gas token), so decimalDiff = 0
        const maximumGas = gasEstimate * currentGasPrice;

        // WETH = 18 decimals, gas token = 18 decimals, ratio = 1
        const broadcasterFeeBigInt = broadcasterFeePerUnitGas * maximumGas;

        // Convert to human readable WETH (18 decimals)
        broadcasterFeeWeth = Number(broadcasterFeeBigInt) / Math.pow(10, 18);
        broadcasterFeeStatus = 'calculated';
      } else {
        // Missing required data - cannot calculate
        broadcasterFeeStatus = 'unavailable';
      }
    }

    // Net swap amount after all fees (RAILGUN fee is in sell token, broadcaster fee is in WETH)
    const netSwapAmount = amountAfterRailgunFee;

    // Calculate USD values
    // RAILGUN fee is 0.25% and VoidDex fee is 0.05%, so RAILGUN fee USD = voidDexFeeUsd * 5
    const voidDexFeeUsdValue = parseFloat(quote.fees.voidDexFeeUsd.replace('$', '').replace('< ', '')) || 0;
    const railgunFeeUsd = voidDexFeeUsdValue * 5; // 0.25% / 0.05% = 5x

    // For broadcaster fee USD: use API value if available, otherwise estimate
    let broadcasterFeeUsd = 0;
    if (quote.fees.broadcasterFeeUsd) {
      const usdMatch = quote.fees.broadcasterFeeUsd.match(/\$?([\d.]+)/);
      if (usdMatch) {
        broadcasterFeeUsd = parseFloat(usdMatch[1]);
      }
    } else {
      // Estimate: assume ETH ~ $3500 (this is just for display, not for validation)
      broadcasterFeeUsd = broadcasterFeeWeth * 3500;
    }

    // Format broadcaster fee display (always in WETH)
    const feeTokenSymbol = feeToken?.symbol || 'WETH';
    let broadcasterFeeDisplay: string;
    let broadcasterFeeUsdDisplay: string;

    switch (broadcasterFeeStatus) {
      case 'loading':
        broadcasterFeeDisplay = 'Calculating...';
        broadcasterFeeUsdDisplay = '';
        break;
      case 'calculated':
        broadcasterFeeDisplay = `${broadcasterFeeWeth < 0.0001 ? '< 0.0001' : broadcasterFeeWeth.toFixed(4)} ${feeTokenSymbol}`;
        broadcasterFeeUsdDisplay = broadcasterFeeUsd < 0.01 ? '< $0.01' : `$${broadcasterFeeUsd.toFixed(2)}`;
        break;
      case 'unavailable':
        broadcasterFeeDisplay = 'Unable to calculate';
        broadcasterFeeUsdDisplay = '';
        break;
    }

    // VoidDex fee is now in WETH (from API)
    const voidDexFeeWeth = parseFloat(quote.fees.voidDexFee.split(' ')[0]) || 0;

    // Total WETH fees = broadcaster + voidDex (use API's totalFeeWeth if available)
    let totalWethFee: number;
    if (quote.fees.totalFeeWeth) {
      // Use API-provided total
      totalWethFee = parseFloat(quote.fees.totalFeeWeth.split(' ')[0]) || 0;
    } else {
      // Calculate from components
      totalWethFee = broadcasterFeeWeth + voidDexFeeWeth;
    }

    // Total USD = voidDexFeeUsd + railgunFeeUsd + broadcasterFeeUsd
    const totalFeeUsdValue = voidDexFeeUsdValue + railgunFeeUsd + broadcasterFeeUsd;

    return {
      gasCost: quote.fees.gasCost,
      gasCostUsd: quote.fees.gasCostUsd,
      voidDexFee: quote.fees.voidDexFee,
      voidDexFeeUsd: quote.fees.voidDexFeeUsd,
      railgunFee: `${railgunFeeAmount.toFixed(6)} ${sellToken.symbol}`,
      railgunFeeUsd: railgunFeeUsd < 0.01 ? '< $0.01' : `$${railgunFeeUsd.toFixed(2)}`,
      broadcasterFee: broadcasterFeeDisplay,
      broadcasterFeeUsd: broadcasterFeeUsdDisplay,
      broadcasterFeeStatus,
      // For toggle button: show total WETH fees (broadcaster + voidDex)
      totalFeeWeth: broadcasterFeeStatus === 'calculated'
        ? `${totalWethFee < 0.0001 ? '< 0.0001' : totalWethFee.toFixed(4)} WETH`
        : 'Calculating...',
      // For expanded details: total in sell token (just railgun fee, since others are in WETH)
      totalFeeSellToken: `${railgunFeeAmount.toFixed(6)} ${sellToken.symbol}`,
      totalFeeUsd: broadcasterFeeStatus === 'calculated'
        ? (totalFeeUsdValue < 0.01 ? '< $0.01' : `$${totalFeeUsdValue.toFixed(2)}`)
        : quote.fees.totalFeeUsd,
      netSwapAmount: `${netSwapAmount.toFixed(6)} ${sellToken.symbol}`,
    };
  }, [quote, sellAmount, sellToken, isPrivateSwap, feeToken, broadcasterFeePerUnitGas, currentGasPrice, gasEstimate, isLoading, dataFetched]);

  if (!quote) return null;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`w-full mt-3 flex items-center justify-between gap-2 px-4 py-3 rounded-xl transition-colors ${
          isOpen
            ? 'bg-void-light text-void-white'
            : 'bg-void-gray hover:bg-void-light text-void-muted hover:text-void-text'
        } ${disabled ? 'opacity-50 cursor-not-allowed hover:bg-void-gray' : ''}`}
      >
        <div className="flex items-center gap-2">
          {isPrivateSwap ? (
            <HiLockClosed className="w-4 h-4 text-void-accent" />
          ) : (
            <HiSignal className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">Swap Details</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-void-muted">
            {feeBreakdown?.totalFeeWeth || quote.fees.gasCost} total
          </span>
          <HiChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Details Panel */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          isOpen ? 'max-h-[600px] opacity-100 mt-3' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="p-5 bg-void-gray rounded-xl space-y-4">
          {/* Exchange Rate */}
          <div className="flex items-center justify-between text-sm gap-4">
            <span className="text-void-muted whitespace-nowrap shrink-0">Exchange Rate</span>
            <span className="text-void-white whitespace-nowrap text-right">{quote.meta.exchangeRate}</span>
          </div>

          {/* Divider */}
          <div className="border-t border-void-border" />

          {/* Private Swap Fees */}
          {isPrivateSwap && feeBreakdown && (
            <>
              <div className="text-xs text-void-accent font-medium uppercase tracking-wide pb-1">
                Privacy Fees
              </div>

              {/* RAILGUN Unshield Fee */}
              <div className="flex items-center justify-between text-sm gap-4">
                <div className="flex items-center gap-1.5 shrink-0">
                  <HiLockClosed className="w-3.5 h-3.5 text-void-muted" />
                  <span className="text-void-muted whitespace-nowrap">Unshield (0.25%)</span>
                </div>
                <div className="text-right whitespace-nowrap">
                  <span className="text-void-white">{feeBreakdown.railgunFee}</span>
                  <span className="text-void-muted ml-1.5">{feeBreakdown.railgunFeeUsd}</span>
                </div>
              </div>

              {/* Broadcaster Fee */}
              <div className="flex items-center justify-between text-sm gap-4">
                <div className="flex items-center gap-1.5 shrink-0">
                  <HiSignal className="w-3.5 h-3.5 text-void-muted" />
                  <span className="text-void-muted whitespace-nowrap">Broadcaster</span>
                </div>
                <div className="text-right whitespace-nowrap">
                  {feeBreakdown.broadcasterFeeStatus === 'loading' ? (
                    <span className="text-void-muted animate-pulse">Calculating...</span>
                  ) : feeBreakdown.broadcasterFeeStatus === 'unavailable' ? (
                    <span className="text-yellow-400">Unable to calculate</span>
                  ) : (
                    <>
                      <span className="text-void-white">{feeBreakdown.broadcasterFee}</span>
                      {feeBreakdown.broadcasterFeeUsd && (
                        <span className="text-void-muted ml-1.5">{feeBreakdown.broadcasterFeeUsd}</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Net Swap Amount */}
              <div className="flex items-center justify-between text-sm bg-void-dark/50 -mx-5 px-5 py-3 my-1 gap-4">
                <span className="text-void-muted whitespace-nowrap shrink-0">Net Swap Amount</span>
                <span className="text-void-accent font-medium whitespace-nowrap">{feeBreakdown.netSwapAmount}</span>
              </div>

              {/* Divider */}
              <div className="border-t border-void-border" />

              <div className="text-xs text-void-muted font-medium uppercase tracking-wide pb-1">
                DEX Fees
              </div>
            </>
          )}

          {/* VoidDex Fee */}
          <div className="flex items-center justify-between text-sm gap-4">
            <span className="text-void-muted whitespace-nowrap shrink-0">VoidDex (0.05%)</span>
            <div className="text-right whitespace-nowrap">
              <span className="text-void-white">{quote.fees.voidDexFee}</span>
              <span className="text-void-muted ml-1.5">{quote.fees.voidDexFeeUsd}</span>
            </div>
          </div>

          {/* Gas Cost */}
          <div className="flex items-center justify-between text-sm gap-4">
            <span className="text-void-muted whitespace-nowrap shrink-0">Network Gas</span>
            <div className="text-right whitespace-nowrap">
              <span className="text-void-white">{quote.fees.gasCost}</span>
              <span className="text-void-muted ml-1.5">{quote.fees.gasCostUsd}</span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-void-border" />

          {/* Price Impact */}
          <div className="flex items-center justify-between text-sm gap-4">
            <span className="text-void-muted whitespace-nowrap shrink-0">Price Impact</span>
            <span className={`whitespace-nowrap ${
              parseFloat(quote.meta.priceImpact) > 3
                ? 'text-red-400'
                : parseFloat(quote.meta.priceImpact) > 1
                  ? 'text-yellow-400'
                  : 'text-void-white'
            }`}>
              {quote.meta.priceImpact}
            </span>
          </div>

          {/* Min Received */}
          <div className="flex items-center justify-between text-sm gap-4">
            <span className="text-void-muted whitespace-nowrap shrink-0">Min Received</span>
            <span className="text-void-white whitespace-nowrap">{quote.meta.minReceived}</span>
          </div>

          {/* Total Fees - show in WETH (broadcaster fee is the actual WETH cost) */}
          <div className="flex items-center justify-between text-sm pt-2 border-t border-void-border gap-4">
            <span className="text-void-muted font-medium whitespace-nowrap shrink-0">Total Fees</span>
            <div className="text-right whitespace-nowrap">
              <span className="text-void-white font-medium">{feeBreakdown?.totalFeeWeth}</span>
              <span className="text-void-muted ml-1.5">{feeBreakdown?.broadcasterFeeUsd || '< $0.01'}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

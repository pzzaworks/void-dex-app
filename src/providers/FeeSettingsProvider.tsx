'use client';

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';

/**
 * WETH-Only Fee System
 *
 * Broadcaster only accepts WETH as fee token.
 * This provider simply returns the WETH address for the current chain.
 */

// WETH addresses by chain ID
export const WETH_ADDRESSES: Record<number, string> = {
  // Ethereum Mainnet
  1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  // Sepolia Testnet
  11155111: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
  // Arbitrum
  42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  // Polygon (WMATIC)
  137: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  // BSC (WBNB)
  56: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
};

export interface FeeToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
}

// Get WETH token info for a chain
export function getWethForChain(chainId: number): FeeToken | null {
  const address = WETH_ADDRESSES[chainId];
  if (!address) return null;

  // Determine symbol based on chain
  let symbol = 'WETH';
  let name = 'Wrapped Ether';
  if (chainId === 137) {
    symbol = 'WMATIC';
    name = 'Wrapped Matic';
  } else if (chainId === 56) {
    symbol = 'WBNB';
    name = 'Wrapped BNB';
  }

  return {
    address,
    symbol,
    name,
    decimals: 18,
    icon: '/tokens/ETH.svg',
  };
}

interface FeeSettingsContextValue {
  // Fee token is always WETH (or wrapped native)
  feeToken: FeeToken | null;

  // Get fee token for any chain
  getFeeTokenForChain: (chainId: number) => FeeToken | null;

  // WETH address for current chain
  wethAddress: string | null;
}

const FeeSettingsContext = createContext<FeeSettingsContextValue | null>(null);

export function FeeSettingsProvider({
  children,
  chainId,
}: {
  children: ReactNode;
  chainId?: number;
}) {
  // Fee token is always WETH for the current chain
  const feeToken = chainId ? getWethForChain(chainId) : null;
  const wethAddress = chainId ? WETH_ADDRESSES[chainId] || null : null;

  const value: FeeSettingsContextValue = {
    feeToken,
    getFeeTokenForChain: getWethForChain,
    wethAddress,
  };

  return (
    <FeeSettingsContext.Provider value={value}>
      {children}
    </FeeSettingsContext.Provider>
  );
}

export function useFeeSettings() {
  const context = useContext(FeeSettingsContext);
  if (!context) {
    throw new Error('useFeeSettings must be used within a FeeSettingsProvider');
  }
  return context;
}

// Backward compatibility exports (deprecated)
// These are kept for components that haven't been updated yet

/** @deprecated Use feeToken from useFeeSettings() instead */
export function useEffectiveFeeToken(_inputTokenAddress: string, chainId: number) {
  return getWethForChain(chainId);
}

/** @deprecated Fee token is always WETH now */
export const SUPPORTED_FEE_TOKENS: Record<number, FeeToken[]> = {
  1: [getWethForChain(1)!],
  11155111: [getWethForChain(11155111)!],
  42161: [getWethForChain(42161)!],
  137: [getWethForChain(137)!],
  56: [getWethForChain(56)!],
};

// ============ Quote Types ============

export interface QuoteParams {
  chainId: number;
  fromToken: string;
  toToken: string;
  fromTokenSymbol?: string;
  toTokenSymbol?: string;
  amount: string;
  slippage?: number;
  type?: 'exactInput' | 'exactOutput'; // exactInput = specify sell amount, exactOutput = specify buy amount
}

export interface QuoteResponse {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  route: RouteInfo;
  fees: FeeInfo;
  meta: QuoteMeta;
}

export interface RouteInfo {
  steps: RouteStep[];
  totalSteps: number;
  isSplit: boolean;
}

export interface RouteStep {
  dexId: string;
  dexName: string;
  percentage: number;
  fromToken: string; // Token symbol for this step's input
  toToken: string; // Token symbol for this step's output
  fromAmount: string;
  toAmount: string;
  estimatedGas: number;
  feeTier?: number; // V3 fee tier (500, 3000, 10000) for single-hop
  feeTiers?: number[]; // V3 fee tiers for multi-hop
  isMultiHop?: boolean;
  path?: string[]; // Token path for the route (e.g., [WETH, USDC, DAI])
  dexData?: string; // DEX-specific encoded data for the swap
}

export interface FeeInfo {
  gasCost: string;
  gasCostUsd: string;
  voidDexFee: string;           // e.g., "0.000123 WETH" (converted to WETH)
  voidDexFeeUsd: string;
  totalFeeUsd: string;
  // WETH-only broadcaster fee (added by API)
  broadcasterFee?: string;       // e.g., "0.001234 WETH"
  broadcasterFeeWei?: string;    // e.g., "1234000000000000"
  broadcasterFeeUsd?: string;    // e.g., "$4.32"
  // Total fees in WETH
  totalFeeWeth?: string;         // e.g., "0.001357 WETH"
}

export interface QuoteMeta {
  priceImpact: string;
  exchangeRate: string;
  minReceived: string;
  expiresAt: number;
}

// ============ Protocol Types ============

export interface DexProtocol {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'maintenance' | 'coming_soon';
  supportedChains: number[];
  avgGasCost: string;
  avgTime: string;
  liquidity: 'high' | 'medium' | 'low';
  features: string[];
}

// ============ Token Types ============

export interface Token {
  symbol: string;
  name: string;
  decimals: number;
  address?: string;
  logoURI?: string;
  chainId?: number;
}

export interface TokenBalance {
  token: Token;
  balance: string;
  balanceUsd: string;
}

// ============ Transaction Types ============

export interface SwapRequest {
  chainId: number;
  fromToken: string;
  toToken: string;
  amount: string;
  slippage: number;
  recipient?: string;
}

export interface SwapResponse {
  transactionId: string;
  status: TransactionStatus;
  txData?: TransactionData;
}

export interface TransactionData {
  to: string;
  data: string;
  value: string;
  gasLimit: string;
}

export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Transaction {
  id: string;
  status: TransactionStatus;
  txHash?: string;
  chainId: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount?: string;
  createdAt: string;
  completedAt?: string;
}

// ============ User Types ============

export interface User {
  id: string;
  walletAddress: string;
  termsAccepted: boolean;
  createdAt: string;
}

// ============ API Response Types ============

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

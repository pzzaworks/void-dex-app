/**
 * Formatting utilities used across the application
 */

/**
 * Truncate an address to show first 6 and last 4 characters
 * @example formatAddress("0x1234567890abcdef1234567890abcdef12345678") => "0x1234...5678"
 */
export function formatAddress(address: string | undefined): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format a bigint balance with specified decimals
 * Shows 4 decimal places by default
 */
export function formatBalance(balance: bigint, decimals: number, precision: number = 4): string {
  const divisor = BigInt(10 ** decimals);
  const intPart = balance / divisor;
  const decPart = balance % divisor;
  const decStr = decPart.toString().padStart(decimals, '0').slice(0, precision);
  return `${intPart}.${decStr}`;
}

/**
 * Format a bigint balance with smart display for very small amounts
 * Returns "<0.0001" for amounts smaller than threshold
 */
export function formatBalanceSmart(balance: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const num = Number(balance) / Number(divisor);
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  return num.toFixed(4);
}

/**
 * Smart format for human-readable amounts
 * - Very large numbers (>=1B): shows with B suffix
 * - Large numbers (>=1M): shows with M suffix
 * - Medium large (>=100K): shows with K suffix
 * - Medium numbers (>=1): 4 decimal places max
 * - Small numbers (<1): up to 6 decimal places max
 * - Very small numbers: shows "<0.000001"
 */
export function formatAmount(amount: string | number, maxDecimals: number = 6): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num === 0) return '0';

  // Always max 6 decimals
  maxDecimals = Math.min(maxDecimals, 6);

  // For very small numbers, show threshold indicator
  const minDisplayable = 0.000001;
  if (num > 0 && num < minDisplayable) {
    return '<0.000001';
  }

  // Very large numbers - use abbreviations
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 100_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  if (num >= 1000) {
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (num >= 1) {
    return num.toFixed(4).replace(/\.?0+$/, '');
  }
  // Small numbers - max 6 decimal places, remove trailing zeros
  return num.toFixed(maxDecimals).replace(/\.?0+$/, '');
}

/**
 * Format a number with fixed decimal places, removing trailing zeros
 */
export function formatNumber(num: number, maxDecimals: number = 6): string {
  return num.toFixed(maxDecimals).replace(/\.?0+$/, '');
}

/**
 * Format USD value with $ prefix
 */
export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Truncate a transaction hash for display
 * @example formatTxHash("0x123...abc") => "0x12345678...abcd1234"
 */
export function formatTxHash(hash: string, startChars: number = 10, endChars: number = 8): string {
  if (!hash) return '';
  if (hash.length <= startChars + endChars) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

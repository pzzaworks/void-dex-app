/**
 * Parse blockchain/wallet errors into user-friendly messages
 */

interface ParsedError {
  message: string;
  code?: string;
  isUserRejection: boolean;
}

// Common error patterns and their user-friendly messages
const ERROR_PATTERNS: Array<{ pattern: RegExp | string; message: string; isUserRejection?: boolean }> = [
  // User rejections
  { pattern: /user rejected/i, message: 'Transaction cancelled', isUserRejection: true },
  { pattern: /user denied/i, message: 'Transaction cancelled', isUserRejection: true },
  { pattern: /rejected the request/i, message: 'Transaction cancelled', isUserRejection: true },
  { pattern: /user refused/i, message: 'Transaction cancelled', isUserRejection: true },
  { pattern: /cancelled/i, message: 'Transaction cancelled', isUserRejection: true },
  { pattern: /user canceled/i, message: 'Transaction cancelled', isUserRejection: true },

  // Insufficient funds
  { pattern: /insufficient funds/i, message: 'Insufficient funds for transaction' },
  { pattern: /insufficient balance/i, message: 'Insufficient balance' },
  { pattern: /exceeds balance/i, message: 'Amount exceeds your balance' },
  { pattern: /not enough/i, message: 'Not enough funds for this transaction' },

  // Gas related
  { pattern: /gas required exceeds/i, message: 'Transaction requires more gas than allowed' },
  { pattern: /out of gas/i, message: 'Transaction ran out of gas' },
  { pattern: /gas too low/i, message: 'Gas price too low' },
  { pattern: /maxFeePerGas/i, message: 'Gas fee estimation failed. Please try again.' },

  // Network issues
  { pattern: /network/i, message: 'Network error. Please check your connection.' },
  { pattern: /timeout/i, message: 'Request timed out. Please try again.' },
  { pattern: /disconnected/i, message: 'Wallet disconnected. Please reconnect.' },
  { pattern: /chain mismatch/i, message: 'Please switch to the correct network' },
  { pattern: /wrong network/i, message: 'Please switch to the correct network' },

  // Contract/Transaction errors
  { pattern: /reverted/i, message: 'Transaction failed. Please try again.' },
  { pattern: /execution reverted/i, message: 'Transaction failed on-chain' },
  { pattern: /nonce too low/i, message: 'Transaction error. Please try again.' },
  { pattern: /replacement.*underpriced/i, message: 'Gas price too low for replacement' },
  { pattern: /already known/i, message: 'Transaction already pending' },

  // RAILGUN specific
  { pattern: /Invalid Snark Proof/i, message: 'Proof verification failed. Please refresh and try again.' },
  { pattern: /merkle tree/i, message: 'Syncing privacy data. Please wait and try again.' },
  { pattern: /no spendable/i, message: 'No spendable balance. Funds may be pending.' },
  { pattern: /POI/i, message: 'Privacy verification pending. Please wait a few minutes.' },
  { pattern: /unable to decrypt/i, message: 'Invalid password or corrupted data. Try unlocking again.' },
  { pattern: /ciphertext/i, message: 'Invalid password or corrupted data. Try unlocking again.' },

  // Wallet connection
  { pattern: /wallet not connected/i, message: 'Please connect your wallet' },
  { pattern: /no provider/i, message: 'Wallet not found. Please install MetaMask or another wallet.' },
  { pattern: /unlock/i, message: 'Please unlock your wallet' },

  // Approval related
  { pattern: /allowance/i, message: 'Token approval required' },
  { pattern: /approve/i, message: 'Please approve the token first' },
];

/**
 * Parse an error into a user-friendly message
 */
export function parseError(error: unknown): ParsedError {
  // Handle null/undefined
  if (!error) {
    return { message: 'An unknown error occurred', isUserRejection: false };
  }

  // Get error message string
  let errorString = '';

  if (typeof error === 'string') {
    errorString = error;
  } else if (error instanceof Error) {
    errorString = error.message;
  } else if (typeof error === 'object') {
    const err = error as Record<string, unknown>;
    // Try common error properties
    errorString = (err.message || err.reason || err.shortMessage || err.details || JSON.stringify(error)) as string;
  }

  // Check against known patterns
  for (const { pattern, message, isUserRejection } of ERROR_PATTERNS) {
    if (typeof pattern === 'string') {
      if (errorString.toLowerCase().includes(pattern.toLowerCase())) {
        return { message, isUserRejection: isUserRejection || false };
      }
    } else if (pattern.test(errorString)) {
      return { message, isUserRejection: isUserRejection || false };
    }
  }

  // If no pattern matched, try to extract a cleaner message
  // Remove common prefixes
  let cleanMessage = errorString
    .replace(/^Error:\s*/i, '')
    .replace(/^TransactionExecutionError:\s*/i, '')
    .replace(/^ContractFunctionExecutionError:\s*/i, '')
    .replace(/^UserRejectedRequestError:\s*/i, 'Transaction cancelled')
    .replace(/Request Arguments:[\s\S]*/i, '') // Remove request arguments
    .replace(/Details:[\s\S]*/i, '') // Remove details
    .replace(/Version:[\s\S]*/i, '') // Remove version info
    .replace(/Contract Call:[\s\S]*/i, '') // Remove contract call info
    .replace(/Docs:[\s\S]*/i, '') // Remove docs link
    .trim();

  // If message is still too long, truncate it
  if (cleanMessage.length > 100) {
    // Try to find a sentence break
    const sentenceEnd = cleanMessage.substring(0, 100).lastIndexOf('.');
    if (sentenceEnd > 20) {
      cleanMessage = cleanMessage.substring(0, sentenceEnd + 1);
    } else {
      cleanMessage = cleanMessage.substring(0, 97) + '...';
    }
  }

  // If we still have nothing useful, return a generic message
  if (!cleanMessage || cleanMessage.length < 3) {
    return { message: 'Transaction failed. Please try again.', isUserRejection: false };
  }

  return { message: cleanMessage, isUserRejection: false };
}

/**
 * Get user-friendly error message string
 */
export function getErrorMessage(error: unknown): string {
  return parseError(error).message;
}

/**
 * Check if error is a user rejection
 */
export function isUserRejectionError(error: unknown): boolean {
  return parseError(error).isUserRejection;
}

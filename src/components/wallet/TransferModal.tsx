'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useChainId } from 'wagmi';
import {
  HiChevronLeft,
  HiXMark,
  HiChevronDown,
  HiCheckBadge,
  HiExclamationTriangle,
  HiCheckCircle,
  HiXCircle,
  HiInformationCircle,
} from 'react-icons/hi2';
import { useRailgun } from '@/providers/RailgunProvider';
import { useRailgunPrivateWalletUI } from '@/providers/RailgunPrivateWalletUIProvider';
import { useTokens } from '@/hooks/useTokens';
import { getNetworkForChain, getNetworkDisplayName } from '@/services/railgun';
import { privateTransfer } from '@/services/railgun/shield';
import toast from 'react-hot-toast';
import { getErrorMessage, isUserRejectionError } from '@/lib/errorParser';
import { formatBalance } from '@/lib/format';

type Step = 'input' | 'confirm' | 'processing' | 'success' | 'error';

// Token type for modal
interface ModalToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
}

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TransferModal({ isOpen, onClose }: TransferModalProps) {
  const chainId = useChainId();
  const {
    wallet,
    encryptionKey,
    status: railgunStatus,
    isInitialized: isRailgunInitialized,
    shieldedBalances,
    isLoadingBalances: balancesLoading,
    refreshShieldedBalances,
  } = useRailgun();
  const { openUnlock } = useRailgunPrivateWalletUI();

  // Get connected network from chain ID
  const selectedNetwork = getNetworkForChain(chainId);

  // Fetch tokens from API (ERC-20 only, no native tokens for RAILGUN)
  const { tokens: apiTokens } = useTokens(chainId);

  // Filter out native tokens - RAILGUN only supports ERC-20 tokens
  const erc20Tokens = useMemo(() => {
    return apiTokens.filter((token) => {
      const addr = token.address.toLowerCase();
      return (
        addr !== '0x0000000000000000000000000000000000000000' &&
        addr !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
      );
    });
  }, [apiTokens]);

  // Helper to get balance from global shielded balances state
  const getBalance = useCallback((tokenAddress: string): bigint => {
    const normalizedAddress = tokenAddress.toLowerCase();
    const balanceInfo = shieldedBalances.get(normalizedAddress);
    return balanceInfo?.total ?? BigInt(0);
  }, [shieldedBalances]);

  // Convert API tokens to ModalToken format and sort by balance (tokens with balance first)
  const tokens: ModalToken[] = useMemo(() => {
    const tokenList = erc20Tokens.map((token) => ({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      icon: token.logo,
    }));

    // Sort: tokens with balance first, then alphabetically
    tokenList.sort((a, b) => {
      const balanceA = getBalance(a.address);
      const balanceB = getBalance(b.address);
      if (balanceA > BigInt(0) && balanceB === BigInt(0)) return -1;
      if (balanceA === BigInt(0) && balanceB > BigInt(0)) return 1;
      return a.symbol.localeCompare(b.symbol);
    });

    return tokenList;
  }, [erc20Tokens, getBalance]);

  const [step, setStep] = useState<Step>('input');
  const [selectedToken, setSelectedToken] = useState<ModalToken | null>(null);
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showTokenList, setShowTokenList] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setSelectedToken(null); // Reset to allow auto-selection based on balance
      setAmount('');
      setRecipientAddress('');
      setError(null);
      setTxHash(null);
    }
  }, [isOpen]);

  // Auto-select first token with balance, or first token if none have balance
  useEffect(() => {
    if (tokens.length > 0 && !selectedToken && !balancesLoading) {
      // Find first token with balance
      const tokenWithBalance = tokens.find(
        (t) => getBalance(t.address) > BigInt(0),
      );
      setSelectedToken(tokenWithBalance || tokens[0]);
    }
  }, [tokens, selectedToken, getBalance, balancesLoading]);

  // Get shielded balance for selected token
  const getShieldedBalance = useCallback(() => {
    if (!selectedToken) return BigInt(0);
    return getBalance(selectedToken.address);
  }, [selectedToken, getBalance]);

  // Handle max button
  const handleMax = useCallback(() => {
    if (!selectedToken) return;
    const balance = getShieldedBalance();
    setAmount(formatBalance(balance, selectedToken.decimals));
  }, [selectedToken, getShieldedBalance]);

  // Detect if address is a Railgun private address
  const isRailgunAddress = (addr: string): boolean => {
    return addr.startsWith('0zk');
  };

  // Handle transfer
  const handleSubmit = useCallback(async () => {
    if (!selectedToken || !amount || !recipientAddress || !wallet) {
      setError('Please fill all fields');
      return;
    }

    setError(null);
    setStep('confirm');
  }, [selectedToken, amount, recipientAddress, wallet]);

  // Handle confirmation
  const handleConfirm = useCallback(async () => {
    if (!selectedToken || !amount || !recipientAddress || !wallet || !encryptionKey) return;

    // Only allow private transfers (0zk addresses)
    if (!isRailgunAddress(recipientAddress)) {
      setError('Only RAILGUN addresses (0zk...) are supported for private transfers');
      return;
    }

    setStep('processing');
    setLoading(true);

    try {
      // Parse amount to bigint
      const decimals = selectedToken.decimals;
      const parts = amount.split('.');
      let amountBigInt: bigint;

      if (parts.length === 2) {
        const intPart = BigInt(parts[0] || '0');
        const decPart = parts[1].padEnd(decimals, '0').slice(0, decimals);
        amountBigInt = intPart * BigInt(10 ** decimals) + BigInt(decPart);
      } else {
        amountBigInt = BigInt(parts[0] || '0') * BigInt(10 ** decimals);
      }

      // Check if network is supported
      if (!selectedNetwork) {
        throw new Error(
          `Unsupported network. Please switch to a supported network (Ethereum, Polygon, Arbitrum, or BNB Chain).`,
        );
      }

      toast.loading('Generating zero-knowledge proof... This may take a minute.', {
        id: 'transfer-tx',
      });

      const transferResult = await privateTransfer(
        {
          walletId: wallet.id,
          network: selectedNetwork,
          tokenAddress: selectedToken.address,
          amount: amountBigInt.toString(),
          toRailgunAddress: recipientAddress,
          encryptionKey: encryptionKey,
        },
        (progress, status) => {
          toast.loading(`${status}`, { id: 'transfer-tx' });
        },
      );

      // Transaction is already sent via broadcaster - get the hash from result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txData = transferResult.transaction as any;
      const hash = txData.hash as string;

      toast.success('Private transfer sent via broadcaster!', { id: 'transfer-tx' });

      setTxHash(hash);
      setStep('success');

      // Refresh balances after successful transaction
      await refreshShieldedBalances(true);
    } catch (err) {
      console.error('[TransferModal] Error:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      setStep('error');
      toast.dismiss('transfer-tx');
      if (!isUserRejectionError(err)) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [
    selectedToken,
    amount,
    recipientAddress,
    wallet,
    encryptionKey,
    selectedNetwork,
    refreshShieldedBalances,
  ]);

  if (!isOpen) return null;

  const shieldedBalance = getShieldedBalance();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[calc(100vh-2rem)] bg-void-dark border border-void-border rounded-2xl flex flex-col overflow-hidden">
        {/* Header - Sticky */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-void-border bg-void-dark">
          <div className="flex items-center gap-3">
            {step !== 'input' && step !== 'success' && step !== 'error' && (
              <button
                onClick={() => setStep('input')}
                className="text-void-muted hover:text-void-white transition-colors"
              >
                <HiChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-void-white">Send Privately</h2>
          </div>
          <button
            onClick={onClose}
            className="text-void-muted hover:text-void-white transition-colors"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Input Step */}
          {step === 'input' && (
            <div className="space-y-4">
              {/* Description */}
              <p className="text-sm text-void-muted">
                Send tokens from your private RAILGUN balance to another address.
              </p>

              {/* Balance Syncing Status */}
              {balancesLoading && (
                <div className="p-3 rounded-lg bg-void-accent/10 border border-void-accent/30">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-void-accent border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-void-accent">Syncing private balances...</p>
                  </div>
                </div>
              )}

              {/* Token Selector */}
              <div>
                <label className="block text-sm text-void-muted mb-1.5">Token</label>
                <div className="relative">
                  <button
                    onClick={() => setShowTokenList(!showTokenList)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-void-gray rounded-xl text-void-white hover:bg-void-light transition-colors"
                  >
                    {selectedToken ? (
                      <div className="flex items-center gap-3">
                        <Image
                          src={selectedToken.icon}
                          alt={selectedToken.symbol}
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                        <div className="text-left">
                          <div className="font-medium">{selectedToken.symbol}</div>
                          <div className="text-xs text-void-muted">{selectedToken.name}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-void-muted">Select token</span>
                    )}
                    <HiChevronDown className="w-5 h-5 text-void-muted" />
                  </button>

                  {showTokenList && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowTokenList(false)} />
                      <div className="absolute top-full left-0 right-0 mt-2 bg-void-dark border border-void-border rounded-xl shadow-2xl overflow-hidden z-20 max-h-60 overflow-y-auto">
                        {tokens.map((token) => (
                          <button
                            key={token.address}
                            onClick={() => {
                              setSelectedToken(token);
                              setShowTokenList(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-void-gray transition-colors"
                          >
                            <Image
                              src={token.icon}
                              alt={token.symbol}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                            <div className="text-left flex-1">
                              <div className="font-medium text-void-white">{token.symbol}</div>
                              <div className="text-xs text-void-muted">{token.name}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-void-muted">Balance</div>
                              <div className="text-sm text-void-white">
                                {formatBalance(
                                  getBalance(token.address),
                                  token.decimals,
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Recipient Address */}
              <div>
                <label className="block text-sm text-void-muted mb-1.5">Recipient Address</label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="0zk... (RAILGUN address)"
                  className="w-full px-4 py-3 bg-void-gray rounded-xl text-void-white placeholder:text-void-muted focus:outline-none focus:ring-1 focus:ring-void-accent font-mono text-sm"
                />
                {recipientAddress && (
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    {isRailgunAddress(recipientAddress) ? (
                      <div className="flex items-center gap-1 text-void-accent">
                        <HiCheckBadge className="w-4 h-4" />
                        <span>Valid RAILGUN address</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-400">
                        <HiExclamationTriangle className="w-4 h-4" />
                        <span>Invalid address - must start with 0zk</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm text-void-muted">Amount</label>
                  {selectedToken && (
                    <div className="text-xs text-void-muted">
                      Balance: {formatBalance(shieldedBalance, selectedToken.decimals)}{' '}
                      {selectedToken.symbol}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d*$/.test(val)) {
                        setAmount(val);
                      }
                    }}
                    placeholder="0.0"
                    className="w-full px-4 py-3 bg-void-gray rounded-xl text-void-white placeholder:text-void-muted focus:outline-none focus:ring-1 focus:ring-void-accent pr-20"
                  />
                  <button
                    onClick={handleMax}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-void-accent hover:bg-void-accent/10 rounded transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-void-gray/50 rounded-xl">
                <div className="flex items-start gap-3">
                  <HiInformationCircle className="w-5 h-5 text-void-accent shrink-0 mt-0.5" />
                  <div className="text-sm text-void-muted">
                    <strong className="text-void-white">How private transfers work:</strong>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>A ZK proof is generated to authorize the transfer</li>
                      <li>Tokens are sent from your private balance</li>
                      <li>Recipient receives tokens in their private RAILGUN balance</li>
                    </ol>
                  </div>
                </div>
              </div>

              {error && <div className="text-sm text-red-400">{error}</div>}

              {/* Submit Button or Unlock Wallet Button */}
              {!wallet ? (
                <button
                  onClick={isRailgunInitialized && railgunStatus === 'locked' ? openUnlock : undefined}
                  disabled={!isRailgunInitialized || railgunStatus !== 'locked'}
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    isRailgunInitialized && railgunStatus === 'locked'
                      ? 'bg-void-accent hover:bg-void-accent-hover text-void-black cursor-pointer'
                      : 'bg-void-gray text-void-muted cursor-not-allowed'
                  }`}
                >
                  {!isRailgunInitialized || railgunStatus === 'initializing' || railgunStatus === 'unlocking'
                    ? 'Initializing...'
                    : 'Unlock Wallet'}
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={
                    !selectedToken ||
                    !amount ||
                    !recipientAddress ||
                    !isRailgunAddress(recipientAddress)
                  }
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    !selectedToken ||
                    !amount ||
                    !recipientAddress ||
                    !isRailgunAddress(recipientAddress)
                      ? 'bg-void-gray text-void-muted cursor-not-allowed'
                      : 'bg-void-accent hover:bg-void-accent-hover text-void-black'
                  }`}
                >
                  Send Privately
                </button>
              )}
            </div>
          )}

          {/* Confirm Step */}
          {step === 'confirm' && selectedToken && (
            <div className="space-y-4">
              <div className="p-4 bg-void-gray rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-void-muted">Action</span>
                  <span className="text-sm text-void-white font-medium">Private Transfer</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-void-muted">Network</span>
                  <span className="text-sm text-void-white">{getNetworkDisplayName(selectedNetwork)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-void-muted">Token</span>
                  <span className="text-sm text-void-white">{selectedToken.symbol}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-void-muted">Amount</span>
                  <span className="text-sm text-void-white font-mono">
                    {amount} {selectedToken.symbol}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-void-muted">To</span>
                  <span className="text-sm text-void-white font-mono">
                    {recipientAddress.slice(0, 8)}...{recipientAddress.slice(-6)}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <HiExclamationTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-200">
                  Please confirm this transaction. A zero-knowledge proof will be generated which
                  may take a few moments.
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 py-3 rounded-xl font-semibold bg-void-gray text-void-white hover:bg-void-light transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl font-semibold bg-void-accent hover:bg-void-accent-hover text-void-black transition-colors flex items-center justify-center gap-2"
                >
                  {loading && (
                    <div className="w-4 h-4 border-2 border-void-black/30 border-t-void-black rounded-full animate-spin" />
                  )}
                  Confirm
                </button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-void-accent/30 border-t-void-accent rounded-full animate-spin" />
              <h3 className="text-lg font-semibold text-void-white mb-2">Generating ZK Proof...</h3>
              <p className="text-sm text-void-muted">This may take a few moments. Please wait...</p>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="py-8 text-center">
              <HiCheckCircle className="w-16 h-16 mx-auto mb-4 text-void-success" />
              <h3 className="text-lg font-semibold text-void-white mb-2">Transfer Successful!</h3>
              <p className="text-sm text-void-muted mb-4">
                Your tokens have been sent to the recipient.
              </p>
              {txHash && (
                <div className="p-3 bg-void-gray rounded-xl mb-4">
                  <div className="text-xs text-void-muted mb-1">Transaction Hash</div>
                  <div className="text-sm text-void-white font-mono break-all">{txHash}</div>
                </div>
              )}
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl font-semibold bg-void-accent hover:bg-void-accent-hover text-void-black transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Error Step */}
          {step === 'error' && (
            <div className="py-8 text-center">
              <HiXCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
              <h3 className="text-lg font-semibold text-void-white mb-2">Transaction Failed</h3>
              <p className="text-sm text-red-400 mb-4">
                {error || 'An unexpected error occurred.'}
              </p>
              <button
                onClick={() => setStep('input')}
                className="w-full py-3 rounded-xl font-semibold bg-void-gray text-void-white hover:bg-void-light transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

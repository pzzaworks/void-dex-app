'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useAccount,
  useBalance,
  useChainId,
  useWriteContract,
  useSignMessage,
  useSendTransaction,
  useReadContracts,
} from 'wagmi';
import { usePublicClient } from 'wagmi';
import { HiChevronLeft, HiXMark } from 'react-icons/hi2';
import { useRailgun } from '@/providers/RailgunProvider';
import { useRailgunPrivateWalletUI } from '@/providers/RailgunPrivateWalletUIProvider';
import { useTokens } from '@/hooks/useTokens';
import {
  getNetworkForChain,
  getRailgunProxyAddress,
  scanAndRefreshBalances,
  NETWORK_TO_CHAIN,
  getRailgunAddressForChain,
  getNetworkDisplayName,
} from '@/services/railgun';
import {
  shieldTokens,
  shieldBaseToken,
  unshieldTokens,
  unshieldBaseToken,
  isNativeToken as checkIsNativeToken,
  isWrappedBaseToken,
  getShieldSignatureMessage,
} from '@/services/railgun/shield';
import { ERC20_ABI } from '@/abis/erc20';
import toast from 'react-hot-toast';
import { getErrorMessage, isUserRejectionError } from '@/lib/errorParser';
import { formatBalance } from '@/lib/format';
import type { Token as TokenSelectorToken } from './shield/TokenSelector';
import { InputStep } from './shield/steps/InputStep';
import { ConfirmStep } from './shield/steps/ConfirmStep';
import { ProcessingStep } from './shield/steps/ProcessingStep';
import { SuccessStep } from './shield/steps/SuccessStep';
import { ErrorStep } from './shield/steps/ErrorStep';

type ModalMode = 'shield' | 'unshield';
type Step = 'input' | 'confirm' | 'processing' | 'success' | 'error';

interface InitialToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
}

interface ShieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: ModalMode;
  initialToken?: InitialToken | null;
}

// Helper to check if a token is native
const isNativeTokenAddress = (address: string): boolean => {
  return (
    address === '0x0000000000000000000000000000000000000000' ||
    address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
  );
};

export function ShieldModal({ isOpen, onClose, initialMode = 'shield', initialToken }: ShieldModalProps) {
  const { address: publicWalletAddress } = useAccount();
  const chainId = useChainId();
  const {
    wallet,
    railgunAddress,
    encryptionKey,
    isProviderReady,
    hasArtifactsCached,
    status: railgunStatus,
    isInitialized: isRailgunInitialized,
    shieldedBalances: globalShieldedBalances,
    isLoadingBalances: balancesLoading,
    refreshShieldedBalances,
  } = useRailgun();
  const { openUnlock } = useRailgunPrivateWalletUI();

  // State initialization (must be before useMemo dependencies)
  const [mode, setMode] = useState<ModalMode>(initialMode);
  const [step, setStep] = useState<Step>('input');
  const [selectedToken, setSelectedToken] = useState<TokenSelectorToken | null>(null);
  const [amount, setAmount] = useState('');
  const [publicAddress, setPublicAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [unshieldProgress, setUnshieldProgress] = useState(0);
  const [unshieldStatus, setUnshieldStatus] = useState('');

  // Get connected network from chain ID
  const selectedNetwork = getNetworkForChain(chainId);

  // Fetch tokens from API
  const { tokens: apiTokens } = useTokens(chainId);

  // Helper to get balance from global shielded balances state
  const getBalance = useCallback((tokenAddress: string): bigint => {
    const normalizedAddress = tokenAddress.toLowerCase();
    const balanceInfo = globalShieldedBalances.get(normalizedAddress);
    return balanceInfo?.total ?? BigInt(0);
  }, [globalShieldedBalances]);

  // Wagmi hooks for contract interactions
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const { signMessageAsync } = useSignMessage();
  const publicClient = usePublicClient();

  // Convert API tokens to TokenSelector format (logo -> icon)
  // For shield mode: Show all tokens (native + ERC20)
  // For unshield mode: Only show ERC20 tokens with shielded balance > 0
  const tokens: TokenSelectorToken[] = useMemo(() => {
    const filtered = apiTokens.filter((token) => {
      const isNative = isNativeTokenAddress(token.address);

      if (mode === 'unshield') {
        // Exclude native tokens (they were wrapped to WETH)
        if (isNative) return false;

        // Only show tokens with shielded balance > 0
        const balanceInfo = globalShieldedBalances.get(token.address.toLowerCase());
        return balanceInfo && balanceInfo.total > BigInt(0);
      }

      // Shield mode: show all tokens (including native)
      return true;
    });

    return filtered.map((token) => ({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      icon: token.logo, // API returns 'logo', component expects 'icon'
    }));
  }, [apiTokens, mode, globalShieldedBalances]);

  // Get native token balance for public wallet
  const { data: nativeBalance } = useBalance({
    address: publicWalletAddress,
  });

  // Prepare ERC20 balance read contracts for all tokens
  const erc20BalanceContracts = useMemo(() => {
    if (!publicWalletAddress || tokens.length === 0) return [];

    // Helper to check if address is native token
    const isNativeAddress = (addr: string) =>
      addr === '0x0000000000000000000000000000000000000000' ||
      addr.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

    return tokens
      .filter((t) => !isNativeAddress(t.address))
      .map((token) => ({
        address: token.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [publicWalletAddress],
      }));
  }, [tokens, publicWalletAddress]);

  // Read all ERC20 balances in a single multicall
  const { data: erc20Balances } = useReadContracts({
    contracts: erc20BalanceContracts,
    query: {
      enabled: erc20BalanceContracts.length > 0 && isOpen,
    },
  });

  // Create a map of token address -> balance for quick lookup
  const erc20BalanceMap = useMemo(() => {
    const map = new Map<string, bigint>();
    if (!erc20Balances) return map;

    // Helper to check if address is native token
    const isNativeAddress = (addr: string) =>
      addr === '0x0000000000000000000000000000000000000000' ||
      addr.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

    const erc20Tokens = tokens.filter((t) => !isNativeAddress(t.address));

    erc20Balances.forEach((result, index) => {
      if (result.status === 'success' && erc20Tokens[index]) {
        map.set(erc20Tokens[index].address.toLowerCase(), BigInt(result.result as string | number));
      }
    });

    return map;
  }, [erc20Balances, tokens]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setStep('input');
      setAmount('');
      setError(null);
      setTxHash(null);
      setPublicAddress(''); // Leave empty - will use connected wallet if not specified
      setUnshieldProgress(0);
      setUnshieldStatus('');

      // Set initial token if provided
      if (initialToken) {
        setSelectedToken({
          address: initialToken.address,
          symbol: initialToken.symbol,
          name: initialToken.name,
          decimals: initialToken.decimals,
          icon: initialToken.logo || '',
        });
      } else {
        setSelectedToken(null); // Let the default token selection effect handle it
      }

      // Broadcaster is initialized by RailgunProvider on wallet unlock
      // Provider is managed globally by RailgunProvider context
      // Fetch balances if provider is already ready
      if (isProviderReady && wallet) {
        refreshShieldedBalances(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMode, initialToken, publicWalletAddress, wallet?.id, isProviderReady]);

  // Fetch balances when provider becomes ready (global provider state)
  useEffect(() => {
    if (isOpen && isProviderReady && wallet && selectedNetwork) {
      refreshShieldedBalances(true);
    }
  }, [isOpen, isProviderReady, wallet?.id, selectedNetwork]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update selected token when tokens are loaded
  useEffect(() => {
    // If no token selected yet, pick first from list
    if (tokens.length > 0 && !selectedToken) {
      setSelectedToken(tokens[0]);
    }
    // Clear selected token if it's no longer in the list (e.g., when switching to unshield with no balance)
    // But only if we don't have an initialToken (to preserve user's selection from swap page)
    if (selectedToken && tokens.length > 0 && !initialToken) {
      const found = tokens.find((t) => t.address.toLowerCase() === selectedToken.address.toLowerCase());
      if (!found) {
        setSelectedToken(tokens[0]);
      }
    }
  }, [tokens, selectedToken, initialToken]);

  // Get shielded balance for selected token
  const getShieldedBalance = useCallback(() => {
    if (!selectedToken) return BigInt(0);
    return getBalance(selectedToken.address);
  }, [selectedToken, getBalance]);

  // Get public wallet balance for selected token
  const getPublicBalance = useCallback(
    (tokenAddress: string): bigint => {
      // Native token - check for both 0x0000... and 0xEeee... formats
      const isNativeToken =
        tokenAddress === '0x0000000000000000000000000000000000000000' ||
        tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

      if (isNativeToken) {
        return nativeBalance?.value || BigInt(0);
      }

      // ERC20 token - lookup from map
      return erc20BalanceMap.get(tokenAddress.toLowerCase()) || BigInt(0);
    },
    [nativeBalance, erc20BalanceMap],
  );

  // Get public balance for selected token
  const getSelectedTokenPublicBalance = useCallback((): bigint => {
    if (!selectedToken) return BigInt(0);
    return getPublicBalance(selectedToken.address);
  }, [selectedToken, getPublicBalance]);

  // Handle max button
  const handleMax = useCallback(() => {
    if (!selectedToken) return;
    if (mode === 'shield') {
      const balance = getPublicBalance(selectedToken.address);
      // For native token, leave some for gas
      const isNativeToken =
        selectedToken.address === '0x0000000000000000000000000000000000000000' ||
        selectedToken.address.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

      const safeBalance = isNativeToken
        ? balance > BigInt(10 ** 15)
          ? balance - BigInt(10 ** 15)
          : BigInt(0) // Leave 0.001 ETH for gas
        : balance;
      setAmount(formatBalance(safeBalance, selectedToken.decimals));
    } else {
      const balance = getShieldedBalance();
      setAmount(formatBalance(balance, selectedToken.decimals));
    }
  }, [mode, selectedToken, getPublicBalance, getShieldedBalance, formatBalance]);

  // Handle shield/unshield
  const handleSubmit = useCallback(async () => {
    if (!selectedToken || !amount) {
      setError('Please select a token and enter an amount');
      return;
    }
    if (!wallet) {
      setError('Please unlock your private wallet first');
      return;
    }
    if (parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }
    setError(null);
    setStep('confirm');
  }, [selectedToken, amount, wallet]);

  // Handle confirmation
  const handleConfirm = useCallback(async () => {
    if (!selectedToken || !amount || !wallet || !publicWalletAddress || !encryptionKey) return;

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

      if (mode === 'shield') {
        // SHIELD TOKENS: From public wallet to RAILGUN private balance
        if (!selectedNetwork) {
          throw new Error(
            `Unsupported network. Please switch to a supported network (Ethereum, Polygon, Arbitrum, or BNB Chain).`,
          );
        }

        // CRITICAL: Verify wallet is on correct chain before sending transaction
        const expectedChainId = NETWORK_TO_CHAIN[selectedNetwork];
        if (chainId !== expectedChainId) {
          throw new Error(
            `Network mismatch! UI shows ${selectedNetwork} (chain ${expectedChainId}) but wallet is on chain ${chainId}. Please switch your wallet to the correct network.`,
          );
        }

        // CRITICAL: Get chain-specific RAILGUN address
        // RAILGUN addresses vary by chain! Using the wrong address will lose funds.
        const chainSpecificAddress = await getRailgunAddressForChain(wallet.id, chainId);
        if (!chainSpecificAddress) {
          throw new Error('Could not get chain-specific RAILGUN address. Please try again.');
        }

        const isNativeToken = checkIsNativeToken(selectedToken.address);

        // Get shield signature from user (needed for both native and ERC20)
        // This signature proves ownership of the public wallet and generates the shield private key
        toast.loading('Please sign the message in your wallet...', { id: 'shield-sig' });

        // CRITICAL: Use SDK's official signature message - custom messages won't work!
        // The SDK expects a specific message format to derive the correct shield private key
        const shieldMessage = await getShieldSignatureMessage();
        const shieldSignature = await signMessageAsync({ message: shieldMessage });

        // Hash the signature with keccak256 to create 32-byte shield private key
        // SDK expects exactly 32 bytes (64 hex chars), signature is 65 bytes
        const { keccak256 } = await import('viem');
        const shieldPrivateKey = keccak256(shieldSignature as `0x${string}`);

        toast.success('Message signed!', { id: 'shield-sig' });

        let shieldResult;

        if (isNativeToken) {
          // NATIVE TOKEN: Use shieldBaseToken (wraps ETH->WETH and shields atomically)
          toast.loading('Preparing wrap & shield transaction...', { id: 'shield-tx' });

          shieldResult = await shieldBaseToken({
            railgunAddress: chainSpecificAddress, // Use chain-specific address!
            network: selectedNetwork,
            amount: amountBigInt.toString(),
            fromAddress: publicWalletAddress,
            shieldPrivateKey: shieldPrivateKey,
          });

          // Send transaction with ETH value
          toast.loading('Please confirm the transaction...', { id: 'shield-tx' });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const txData = shieldResult.transaction as any;
          const txHash = await sendTransactionAsync({
            to: txData.to as `0x${string}`,
            data: txData.data as `0x${string}`,
            value: amountBigInt, // Send ETH value for native token
          });

          setTxHash(txHash);

          // Wait for transaction to be mined
          toast.loading('Waiting for transaction confirmation...', { id: 'shield-tx' });
          await publicClient?.waitForTransactionReceipt({ hash: txHash });
          toast.success('Shield transaction confirmed!', { id: 'shield-tx' });

          setStep('success');
        } else {
          // ERC20 TOKEN: Check approval and use shieldTokens
          if (publicClient) {
            const railgunProxyAddress = await getRailgunProxyAddress(selectedNetwork);

            try {
              const allowance = (await publicClient.readContract({
                address: selectedToken.address as `0x${string}`,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [publicWalletAddress, railgunProxyAddress],
              })) as bigint;

              if (allowance < amountBigInt) {
                toast.loading('Requesting token approval...', { id: 'shield-approval' });

                await writeContractAsync({
                  address: selectedToken.address as `0x${string}`,
                  abi: ERC20_ABI,
                  functionName: 'approve',
                  args: [railgunProxyAddress, amountBigInt],
                });

                toast.success('Token approved!', { id: 'shield-approval' });

                // Wait for approval to be mined
                await new Promise((resolve) => setTimeout(resolve, 2000));
              }
            } catch (approvalErr) {
              console.error('[ShieldModal] Approval error:', approvalErr);
              toast.error('Token approval failed', { id: 'shield-approval' });
              throw new Error('Token approval failed. Please try again.');
            }
          }

          // Prepare shield transaction
          toast.loading('Preparing shield transaction...', { id: 'shield-tx' });

          shieldResult = await shieldTokens({
            railgunAddress: chainSpecificAddress, // Use chain-specific address!
            network: selectedNetwork,
            tokenAddress: selectedToken.address,
            amount: amountBigInt.toString(),
            fromAddress: publicWalletAddress,
            shieldPrivateKey: shieldPrivateKey,
          });

          // Send transaction
          toast.loading('Please confirm the transaction...', { id: 'shield-tx' });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const txData = shieldResult.transaction as any;
          const txHash = await sendTransactionAsync({
            to: txData.to as `0x${string}`,
            data: txData.data as `0x${string}`,
            value: BigInt(0), // No ETH value for ERC20
          });

          setTxHash(txHash);

          // Wait for transaction to be mined
          toast.loading('Waiting for transaction confirmation...', { id: 'shield-tx' });
          await publicClient?.waitForTransactionReceipt({ hash: txHash });
          toast.success('Shield transaction confirmed!', { id: 'shield-tx' });

          setStep('success');
        }

        // Scan merkle tree and refresh balances after shield transaction
        // Wait for transaction to be indexed
        toast.loading('Syncing privacy balances...', { id: 'shield-tx' });
        await new Promise((resolve) => setTimeout(resolve, 5000));
        if (wallet && selectedNetwork) {
          await scanAndRefreshBalances(wallet.id, selectedNetwork);
        }
        toast.dismiss('shield-tx');
        // Force refresh UI (bypass rate limit after tx)
        await refreshShieldedBalances(true);
      } else {
        // UNSHIELD TOKENS: From RAILGUN private balance to public wallet

        // CRITICAL: Verify wallet is on correct chain before sending transaction
        const expectedChainId = NETWORK_TO_CHAIN[selectedNetwork!];
        if (chainId !== expectedChainId) {
          throw new Error(
            `Network mismatch! UI shows ${selectedNetwork} (chain ${expectedChainId}) but wallet is on chain ${chainId}. Please switch your wallet to the correct network.`,
          );
        }

        // Reset progress state
        setUnshieldProgress(0);
        setUnshieldStatus('Preparing...');

        const targetAddress = publicAddress || publicWalletAddress;

        // Check if token is a wrapped base token (WETH, WMATIC, WBNB)
        // Base tokens need special handling via RelayAdapt contract
        const isBaseToken = isWrappedBaseToken(selectedToken.address, selectedNetwork!);

        let unshieldResult;
        if (isBaseToken) {
          unshieldResult = await unshieldBaseToken(
            {
              walletId: wallet.id,
              network: selectedNetwork!,
              tokenAddress: selectedToken.address.toLowerCase(),
              amount: amountBigInt.toString(),
              toAddress: targetAddress,
              encryptionKey: encryptionKey,
            },
            (progress, status) => {
              setUnshieldProgress(Math.round(progress * 100));
              setUnshieldStatus(status);
            },
          );
        } else {
          unshieldResult = await unshieldTokens(
            {
              walletId: wallet.id,
              network: selectedNetwork!,
              tokenAddress: selectedToken.address.toLowerCase(), // CRITICAL: Must be lowercase for RAILGUN
              amount: amountBigInt.toString(),
              toAddress: targetAddress,
              encryptionKey: encryptionKey,
            },
            (progress, status) => {
              // Update modal progress UI instead of toast
              setUnshieldProgress(Math.round(progress * 100));
              setUnshieldStatus(status);
            },
          );
        }

        // Transaction is already sent via broadcaster - get the hash from result
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const txData = unshieldResult.transaction as any;
        const txHash = txData.hash as string;

        setTxHash(txHash);

        // Wait for transaction to be mined
        setUnshieldProgress(100);
        setUnshieldStatus('Waiting for transaction confirmation...');
        const receipt = await publicClient?.waitForTransactionReceipt({ hash: txHash as `0x${string}` });

        // Check if transaction was successful
        if (receipt?.status === 'reverted') {
          throw new Error('Transaction reverted on-chain. The ZK proof may be invalid.');
        }

        setStep('success');

        // Scan merkle tree and refresh balances after unshield transaction (silent)
        await new Promise((resolve) => setTimeout(resolve, 3000));
        if (wallet && selectedNetwork) {
          await scanAndRefreshBalances(wallet.id, selectedNetwork);
        }
        // Force refresh UI (bypass rate limit after tx)
        await refreshShieldedBalances(true);
      }
    } catch (err) {
      console.error('[ShieldModal] Error:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      setStep('error');
      // Don't show toast for user rejections - they know they cancelled
      if (!isUserRejectionError(err)) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [
    selectedToken,
    amount,
    wallet,
    publicWalletAddress,
    railgunAddress,
    encryptionKey,
    mode,
    selectedNetwork,
    publicAddress,
    refreshShieldedBalances,
    writeContractAsync,
    sendTransactionAsync,
    signMessageAsync,
    publicClient,
  ]);

  if (!isOpen) return null;

  const shieldedBalance = getShieldedBalance();
  const publicBalance = getSelectedTokenPublicBalance();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - disabled during processing */}
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-sm"
        onClick={step !== 'processing' ? onClose : undefined}
      />

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
            <div>
              <h2 className="text-lg font-semibold text-void-white">
                {mode === 'shield' ? 'Shield Tokens' : 'Unshield Tokens'}
              </h2>
              <p className="text-xs text-void-muted">on {getNetworkDisplayName(selectedNetwork) || 'Unknown Network'}</p>
            </div>
          </div>
          {step !== 'processing' && (
            <button
              onClick={onClose}
              className="text-void-muted hover:text-void-white transition-colors"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Mode Toggle */}
        {step === 'input' && (
          <div className="flex p-2 mx-6 mt-4 bg-void-gray rounded-xl">
            <button
              onClick={() => setMode('shield')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                mode === 'shield'
                  ? 'bg-void-accent text-void-black'
                  : 'text-void-muted hover:text-void-white'
              }`}
            >
              Shield
            </button>
            <button
              onClick={() => setMode('unshield')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                mode === 'unshield'
                  ? 'bg-void-accent text-void-black'
                  : 'text-void-muted hover:text-void-white'
              }`}
            >
              Unshield
            </button>
          </div>
        )}

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'input' && (
            <InputStep
              mode={mode}
              selectedToken={selectedToken}
              tokens={tokens}
              onTokenSelect={setSelectedToken}
              amount={amount}
              onAmountChange={setAmount}
              publicAddress={publicAddress}
              onAddressChange={setPublicAddress}
              shieldedBalance={shieldedBalance}
              publicBalance={publicBalance}
              formatBalance={formatBalance}
              getBalance={(address) =>
                mode === 'shield'
                  ? getPublicBalance(address)
                  : getBalance(address)
              }
              onMax={handleMax}
              onSubmit={handleSubmit}
              error={error}
              hasWallet={!!wallet}
              canUnlock={isRailgunInitialized && railgunStatus === 'locked'}
              isRailgunLoading={!isRailgunInitialized || railgunStatus === 'initializing' || railgunStatus === 'unlocking'}
              onUnlockWallet={openUnlock}
              balancesLoading={balancesLoading}
              providerLoading={!!wallet && !isProviderReady}
              hasArtifactsCached={hasArtifactsCached}
            />
          )}

          {step === 'confirm' && selectedToken && (
            <ConfirmStep
              mode={mode}
              selectedNetwork={selectedNetwork}
              selectedToken={selectedToken}
              amount={amount}
              publicAddress={publicAddress}
              loading={loading}
              onConfirm={handleConfirm}
              onBack={() => setStep('input')}
            />
          )}

          {step === 'processing' && (
            <ProcessingStep
              mode={mode}
              progress={unshieldProgress}
              status={unshieldStatus}
            />
          )}

          {step === 'success' && <SuccessStep mode={mode} txHash={txHash} onClose={onClose} />}

          {step === 'error' && <ErrorStep error={error} onRetry={() => setStep('input')} />}
        </div>
      </div>
    </div>
  );
}

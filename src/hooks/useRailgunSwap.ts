import { useState, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useRailgunWallet } from './useRailgunWallet';
import { useRailgun } from '@/providers/RailgunProvider';
import { useFeeSettings } from '@/providers/FeeSettingsProvider';
import { encodeFunctionData, isAddress } from 'viem';
import { getAddress as ethersGetAddress } from 'ethers';

export interface SwapRoute {
  dexId: string;
  percentage: number;
  minAmountOut: string;
  dexData: string;
}

// Sequential step for multi-hop swaps (A->B->C)
export interface SequentialStep {
  dexId: string;
  tokenOut: string;
  minAmountOut: string;
  dexData: string;
}

export interface RailgunSwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  routes: SwapRoute[];
  sequentialSteps?: SequentialStep[]; // For multi-hop sequential swaps
  isSequential?: boolean; // True if this is a multi-hop sequential swap
  voidDexRouterAddress: string;
}

// VoidDexRouter ABI for swapMultiRoute (split routing)
const VOID_DEX_ROUTER_ABI = [
  {
    name: 'swapMultiRoute',
    type: 'function',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'minTotalAmountOut', type: 'uint256' },
      {
        name: 'routes',
        type: 'tuple[]',
        components: [
          { name: 'dexId', type: 'bytes32' },
          { name: 'percentage', type: 'uint256' },
          { name: 'minAmountOut', type: 'uint256' },
          { name: 'dexData', type: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: 'totalAmountOut', type: 'uint256' }],
    stateMutability: 'payable',
  },
] as const;

// VoidDexRouter ABI for swapSequential (multi-hop routing A->B->C)
const VOID_DEX_ROUTER_SEQUENTIAL_ABI = [
  {
    name: 'swapSequential',
    type: 'function',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'minFinalAmountOut', type: 'uint256' },
      {
        name: 'steps',
        type: 'tuple[]',
        components: [
          { name: 'dexId', type: 'bytes32' },
          { name: 'tokenOut', type: 'address' },
          { name: 'minAmountOut', type: 'uint256' },
          { name: 'dexData', type: 'bytes' },
        ],
      },
    ],
    outputs: [{ name: 'finalAmountOut', type: 'uint256' }],
    stateMutability: 'payable',
  },
] as const;

// Cross-contract call type for RAILGUN SDK
interface ContractTransaction {
  to: string;
  data: string;
  value?: bigint;
}

// Railgun SDK types
type RailgunERC20Amount = {
  tokenAddress: string;
  amount: bigint;
};

// For shielding output tokens back to the RAILGUN wallet
type RailgunERC20Recipient = {
  tokenAddress: string;
  recipientAddress: string; // RAILGUN address (0zk...)
};

type TransactionGasDetails = {
  gasEstimate: bigint;
  evmGasType: number; // 0=Legacy, 1=Type1(EIP-2930), 2=Type2(EIP-1559)
  gasPrice?: bigint; // For Type0/Type1
  maxFeePerGas?: bigint; // For Type2
  maxPriorityFeePerGas?: bigint; // For Type2
};

/**
 * Validate and checksum an Ethereum address
 * Throws if the address is invalid
 */
function validateAndChecksumAddress(address: string, name: string): string {
  if (!address) {
    throw new Error(`${name} is empty or undefined`);
  }
  if (!isAddress(address)) {
    throw new Error(`${name} is not a valid Ethereum address: ${address}`);
  }
  try {
    // Use ethers' getAddress to get the checksummed version
    return ethersGetAddress(address);
  } catch {
    throw new Error(`${name} failed checksum validation: ${address}`);
  }
}

/**
 * Hook for executing private swaps via Railgun
 * Uses Railgun's cross-contract calls (Relay Adapt Contract)
 *
 * Flow:
 * 1. Unshield input tokens from private balance
 * 2. Execute swap on VoidDexRouter
 * 3. Shield output tokens back to private balance
 */
export function useRailgunSwap() {
  const { chainId } = useAccount();
  const { wallet, encryptionKey, isReady, railgunAddress } = useRailgunWallet();
  const publicClient = usePublicClient();
  const { feeToken, wethAddress } = useFeeSettings();
  const { shieldedBalances, getShieldedBalance } = useRailgun();

  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ percent: number; status: string } | null>(null);

  /**
   * Estimate gas for private swap
   */
  const estimateGas = useCallback(
    async (params: RailgunSwapParams): Promise<bigint> => {
      if (!isReady || !wallet || !chainId || !encryptionKey) {
        throw new Error('Railgun wallet not initialized');
      }

      // Validate and checksum all addresses
      const validatedTokenIn = validateAndChecksumAddress(params.tokenIn, 'tokenIn');
      const validatedTokenOut = validateAndChecksumAddress(params.tokenOut, 'tokenOut');
      const validatedRouter = validateAndChecksumAddress(params.voidDexRouterAddress, 'voidDexRouterAddress');

      const { CHAIN_TO_NETWORK } = await import('@/services/railgun/constants');
      const network = CHAIN_TO_NETWORK[chainId];
      if (!network) {
        throw new Error(`Unsupported chain: ${chainId}`);
      }

      const { gasEstimateForUnprovenCrossContractCalls } = await import(
        '@railgun-community/wallet'
      );
      const { TXIDVersion } = await import('@railgun-community/shared-models');

      // RAILGUN takes 0.25% fee - account for it in unshield amount
      const relayAdaptFeePercent = 0.0025;
      const amountWithFee = BigInt(
        Math.ceil(Number(params.amountIn) * (1 + relayAdaptFeePercent)),
      );

      // Calculate amount after unshield fee (what we'll actually have to spend)
      const unshieldFeeBasisPoints = BigInt(25); // 0.25%
      const amountAfterUnshieldFee = (amountWithFee * (BigInt(10000) - unshieldFeeBasisPoints)) / BigInt(10000);

      // Prepare swap calldata with validated addresses
      // Use amountAfterUnshieldFee as the swap amount
      const validatedParams = {
        ...params,
        amountIn: amountAfterUnshieldFee.toString(),
        tokenIn: validatedTokenIn,
        tokenOut: validatedTokenOut,
        voidDexRouterAddress: validatedRouter,
      };
      const swapCallData = encodeSwapCallData(validatedParams);

      // Prepare approval calldata with validated addresses
      const approveCallData = encodeFunctionData({
        abi: [{
          name: 'approve',
          type: 'function',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ name: '', type: 'bool' }],
          stateMutability: 'nonpayable',
        }],
        functionName: 'approve',
        args: [validatedRouter as `0x${string}`, amountAfterUnshieldFee],
      });

      // Cross-contract calls: 1) Approve router, 2) Execute swap
      // IMPORTANT: SDK expects checksummed addresses for crossContractCalls
      const crossContractCalls: ContractTransaction[] = [
        {
          to: validatedTokenIn, // Keep checksummed
          data: approveCallData,
          value: BigInt(0),
        },
        {
          to: validatedRouter, // Keep checksummed
          data: swapCallData,
          value: BigInt(0),
        },
      ];

      // Tokens to unshield (input token)
      const relayAdaptUnshieldERC20Amounts: RailgunERC20Amount[] = [
        {
          tokenAddress: validatedTokenIn.toLowerCase(),
          amount: amountWithFee,
        },
      ];

      // Token recipients to shield (output token goes back to our RAILGUN wallet)
      const shieldRecipientAddress = wallet.railgunAddress || railgunAddress;
      if (!shieldRecipientAddress) {
        throw new Error('Railgun address not found');
      }
      const relayAdaptShieldERC20Recipients: RailgunERC20Recipient[] = [
        {
          tokenAddress: validatedTokenOut.toLowerCase(),
          recipientAddress: shieldRecipientAddress, // Shield back to our wallet
        },
      ];

      // Get real gas prices from network
      if (!publicClient) {
        throw new Error('Public client not available');
      }

      const { createSequentialProvider } = await import('@/lib/rpc');
      const provider = await createSequentialProvider(chainId);
      const feeData = await provider.getFeeData();

      if (!feeData.gasPrice) {
        throw new Error('Failed to get gas price from network');
      }

      const isTestnet = chainId === 11155111;
      // SDK needs a minimum starting estimate for its internal minGasLimit calculation
      const MIN_STARTING_GAS_ESTIMATE = BigInt(500000);
      const originalGasDetails: TransactionGasDetails = isTestnet
        ? {
            evmGasType: 1,
            gasEstimate: MIN_STARTING_GAS_ESTIMATE,
            gasPrice: feeData.gasPrice,
          }
        : {
            evmGasType: 2,
            gasEstimate: MIN_STARTING_GAS_ESTIMATE,
            maxFeePerGas: feeData.maxFeePerGas || feeData.gasPrice,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || BigInt(1),
          };

      const { gasEstimate } = await gasEstimateForUnprovenCrossContractCalls(
        TXIDVersion.V2_PoseidonMerkle,
        network as any,
        wallet.id,
        encryptionKey,
        relayAdaptUnshieldERC20Amounts as any,
        [],
        relayAdaptShieldERC20Recipients as any,
        [],
        crossContractCalls as any,
        originalGasDetails as any,
        undefined,
        false,
        BigInt(0),
      );

      if (!gasEstimate) {
        throw new Error('Failed to get gas estimate from SDK');
      }

      return gasEstimate;
    },
    [isReady, wallet, chainId, encryptionKey, publicClient],
  );

  /**
   * Execute a private swap through Railgun cross-contract calls
   *
   * This will:
   * 1. Unshield input tokens from RAILGUN private balance
   * 2. Call VoidDexRouter.swapMultiRoute() with the tokens
   * 3. Shield output tokens back to RAILGUN private balance
   */
  const executePrivateSwap = useCallback(
    async (params: RailgunSwapParams): Promise<string> => {
      if (!isReady || !wallet || !chainId || !encryptionKey) {
        throw new Error('Railgun wallet not initialized');
      }

      if (!publicClient) {
        throw new Error('Public client not available');
      }

      setIsSwapping(true);
      setError(null);
      setTxHash(null);
      setProgress({ percent: 0, status: 'Preparing transaction...' });

      try {
        if (!wallet.railgunAddress && !railgunAddress) {
          throw new Error('Railgun wallet address not found. Please unlock your wallet first.');
        }

        // Validate and checksum all addresses before passing to SDK
        // This prevents "Cannot read properties of undefined (reading 'toUpperCase')" errors
        const validatedTokenIn = validateAndChecksumAddress(params.tokenIn, 'tokenIn');
        const validatedTokenOut = validateAndChecksumAddress(params.tokenOut, 'tokenOut');
        const validatedRouter = validateAndChecksumAddress(params.voidDexRouterAddress, 'voidDexRouterAddress');

        const { CHAIN_TO_NETWORK } = await import(
          '@/services/railgun/constants'
        );
        const network = CHAIN_TO_NETWORK[chainId];

        if (!network) {
          throw new Error(`Unsupported chain: ${chainId}`);
        }

        const { loadNetworkProvider } = await import('@/services/railgun/init');

        // Ensure provider is loaded
        setProgress({ percent: 5, status: 'Loading network provider...' });
        const providerLoaded = await loadNetworkProvider(network);

        if (!providerLoaded) {
          throw new Error(`Failed to load provider for network ${network}`);
        }

        // Initialize broadcaster for private transaction relay
        setProgress({ percent: 7, status: 'Connecting to broadcaster network...' });
        const { ensureBroadcasterReady, findBestBroadcaster } = await import('@/services/railgun/relayer');
        const broadcasterReady = await ensureBroadcasterReady(network);

        if (!broadcasterReady) {
          throw new Error('Failed to connect to broadcaster network. Private swaps require a broadcaster to relay transactions anonymously. Please try again.');
        }

        const {
          gasEstimateForUnprovenCrossContractCalls,
          generateCrossContractCallsProof,
          populateProvedCrossContractCalls,
          refreshBalances,
          clearArtifactCache,
        } = await import('@railgun-community/wallet');
        const { TXIDVersion } = await import('@railgun-community/shared-models');
        const { BroadcasterTransaction } = await import('@railgun-community/waku-broadcaster-client-web');

        // Clear SDK's in-memory artifact cache to ensure fresh artifacts are used
        // This is important after artifacts are re-downloaded
        clearArtifactCache();

        // Sync merkle tree
        setProgress({ percent: 10, status: 'Syncing merkle tree...' });
        const chain = { type: 0, id: chainId };
        await refreshBalances(chain, [wallet.id]);

        // User's input is the TOTAL they want to spend from balance (including all fees)
        // We need to calculate: unshield amount, broadcaster fee, and actual swap amount
        //
        // Flow:
        // 1. User enters total amount to spend (e.g., MAX balance)
        // 2. We unshield this amount
        // 3. RAILGUN takes 0.25% unshield fee
        // 4. Broadcaster fee is paid from remaining
        // 5. Rest goes to swap
        //
        // Formula:
        // unshieldAmount = userInput
        // afterUnshieldFee = unshieldAmount * 0.9975
        // swapAmount = afterUnshieldFee - broadcasterFee

        const userInputAmount = BigInt(params.amountIn);
        const unshieldFeeBasisPoints = BigInt(25); // 0.25%

        // This is what we'll have after unshield fee
        const amountAfterUnshieldFee = (userInputAmount * (BigInt(10000) - unshieldFeeBasisPoints)) / BigInt(10000);

        // Token recipients to shield (output token goes back to our RAILGUN wallet)
        const shieldRecipientAddress = wallet.railgunAddress || railgunAddress;
        if (!shieldRecipientAddress) {
          throw new Error('Railgun address not found');
        }
        const relayAdaptShieldERC20Recipients: RailgunERC20Recipient[] = [
          {
            tokenAddress: validatedTokenOut.toLowerCase(),
            recipientAddress: shieldRecipientAddress,
          },
        ];

        // Get gas prices
        setProgress({ percent: 18, status: 'Getting gas prices...' });
        const { createSequentialProvider } = await import('@/lib/rpc');
        const provider = await createSequentialProvider(chainId);
        const feeData = await provider.getFeeData();

        // Determine EVM gas type based on network
        // Sepolia uses Type1 (legacy), mainnet uses Type2 (EIP-1559)
        const isTestnet = chainId === 11155111; // Sepolia

        // WETH-Only Fee System: Fee is always paid in WETH
        if (!feeToken || !wethAddress) {
          throw new Error('WETH fee token not available for this network.');
        }

        const feeTokenAddress = validateAndChecksumAddress(feeToken.address, 'feeToken');
        const feeTokenDecimals = feeToken.decimals;
        const usingSeparateFeeToken = feeTokenAddress.toLowerCase() !== validatedTokenIn.toLowerCase();

        // Find best broadcaster for the fee token
        setProgress({ percent: 20, status: 'Finding broadcaster...' });
        const broadcasterInfo = await findBestBroadcaster(network, feeTokenAddress.toLowerCase(), true);

        if (!broadcasterInfo) {
          throw new Error(`No broadcaster available for fee token ${feeTokenAddress}. Please select a different fee token.`);
        }

        // Get gas price from RPC - no fallbacks, require real data
        if (!feeData.gasPrice) {
          throw new Error('Failed to get gas price from network. Please try again.');
        }

        let gasPrice = feeData.gasPrice;
        let maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice;

        // Testnet gas prices can be extremely low (< 1 gwei) which broadcasters may reject
        // Enforce minimum 0.1 gwei for testnet to ensure broadcaster accepts the transaction
        const MIN_GAS_PRICE_WEI = isTestnet ? BigInt(100_000_000) : BigInt(0); // 0.1 gwei for testnet
        if (gasPrice < MIN_GAS_PRICE_WEI) {
          gasPrice = MIN_GAS_PRICE_WEI;
          maxFeePerGas = MIN_GAS_PRICE_WEI;
        }

        const GAS_TOKEN_DECIMALS = 18; // ETH
        const effectiveGasPrice = isTestnet ? gasPrice : maxFeePerGas;

        // Get actual token decimals for input token
        const inputTokenDecimals = await publicClient.readContract({
          address: validatedTokenIn as `0x${string}`,
          abi: [{ name: 'decimals', type: 'function', inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' }],
          functionName: 'decimals',
        }) as number;

        // ============================================================
        // STEP 1: Get actual gas estimate from SDK
        // ============================================================
        setProgress({ percent: 22, status: 'Estimating gas...' });

        // For gas estimation, use full input amount (we'll adjust after we know the fee)
        const preliminarySwapCallData = encodeSwapCallData({
          ...params,
          amountIn: amountAfterUnshieldFee.toString(),
          tokenIn: validatedTokenIn,
          tokenOut: validatedTokenOut,
          voidDexRouterAddress: validatedRouter,
        });

        const preliminaryApproveCallData = encodeFunctionData({
          abi: [{
            name: 'approve',
            type: 'function',
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'nonpayable',
          }],
          functionName: 'approve',
          args: [validatedRouter as `0x${string}`, amountAfterUnshieldFee],
        });

        const preliminaryCrossContractCalls: ContractTransaction[] = [
          { to: validatedTokenIn, data: preliminaryApproveCallData, value: BigInt(0) },
          { to: validatedRouter, data: preliminarySwapCallData, value: BigInt(0) },
        ];

        const preliminaryUnshieldAmounts: RailgunERC20Amount[] = [{
          tokenAddress: validatedTokenIn.toLowerCase(),
          amount: userInputAmount,
        }];

        // Gas details for SDK estimation call
        // SDK needs a minimum starting estimate for its internal minGasLimit calculation
        // (SDK computes minGasLimit = gasEstimate - buffer, so 0 would go negative)
        // 500,000 is a safe minimum for any contract interaction
        const MIN_STARTING_GAS_ESTIMATE = BigInt(500000);
        const transactionGasDetails: TransactionGasDetails = isTestnet
          ? { evmGasType: 1, gasEstimate: MIN_STARTING_GAS_ESTIMATE, gasPrice: gasPrice }
          : { evmGasType: 2, gasEstimate: MIN_STARTING_GAS_ESTIMATE, maxFeePerGas: maxFeePerGas, maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || BigInt(1) };

        const feeTokenDetails = {
          tokenAddress: feeTokenAddress.toLowerCase(),
          feePerUnitGas: broadcasterInfo.feePerUnitGas,
        };

        // SDK requires a minimum gas limit to prevent negative values during internal calculations
        // SDK internally calculates: effectiveMinGasLimit = passedMinGasLimit - buffer
        // If we pass 0, and buffer is ~150000, result would be -150000 (invalid)
        // We use the same value as transactionGasDetails.gasEstimate for consistency
        const gasEstimateResult = await gasEstimateForUnprovenCrossContractCalls(
          TXIDVersion.V2_PoseidonMerkle,
          network as any,
          wallet.id,
          encryptionKey,
          preliminaryUnshieldAmounts as any,
          [],
          relayAdaptShieldERC20Recipients as any,
          [],
          preliminaryCrossContractCalls as any,
          transactionGasDetails as any,
          feeTokenDetails,
          false,
          MIN_STARTING_GAS_ESTIMATE, // minGasLimit - must be >= SDK's internal buffer (~150000)
        );

        if (!gasEstimateResult.gasEstimate) {
          throw new Error('Failed to get gas estimate from SDK. Please try again.');
        }

        const actualGasEstimate = gasEstimateResult.gasEstimate;

        // ============================================================
        // STEP 2: Calculate broadcaster fee with ACTUAL gas estimate
        // ============================================================
        const feeDecimalRatio = BigInt(10) ** BigInt(GAS_TOKEN_DECIMALS - feeTokenDecimals);
        const maximumGas = actualGasEstimate * effectiveGasPrice;
        const broadcasterFee = (broadcasterInfo.feePerUnitGas * maximumGas) / feeDecimalRatio;

        const feeInHumanReadable = Number(broadcasterFee) / Math.pow(10, feeTokenDecimals);

        // ============================================================
        // STEP 3: Validate WETH balance for fee (if input token is not WETH)
        // ============================================================
        if (usingSeparateFeeToken) {
          // Use getShieldedBalance which handles WETH/native token properly
          const wethBalance = getShieldedBalance(feeTokenAddress);
          const wethSpendable = wethBalance?.spendable || BigInt(0);

          console.log('[RailgunSwap] WETH balance check:', {
            feeTokenAddress,
            wethBalance,
            wethSpendable: wethSpendable.toString(),
            broadcasterFee: broadcasterFee.toString(),
          });

          if (wethSpendable < broadcasterFee) {
            const balanceInHuman = Number(wethSpendable) / Math.pow(10, feeTokenDecimals);
            throw new Error(
              `Insufficient shielded ${feeToken.symbol} for broadcaster fee. ` +
              `Required: ${feeInHumanReadable.toFixed(6)} ${feeToken.symbol}, ` +
              `Available: ${balanceInHuman.toFixed(6)} ${feeToken.symbol}. ` +
              `Please shield some ${feeToken.symbol} first.`
            );
          }
        }

        // ============================================================
        // STEP 4: Calculate final swap amount with actual fee
        // ============================================================
        const swapAmount = usingSeparateFeeToken
          ? amountAfterUnshieldFee
          : amountAfterUnshieldFee - broadcasterFee;

        if (swapAmount <= BigInt(0)) {
          throw new Error(
            `Amount too small after fees. ` +
            `Unshield fee: ${(userInputAmount - amountAfterUnshieldFee).toString()}, ` +
            `Broadcaster fee: ${broadcasterFee.toString()}, ` +
            `Remaining: ${swapAmount.toString()}`
          );
        }

        // ============================================================
        // STEP 5: Prepare final swap calldata with correct amount
        // ============================================================
        setProgress({ percent: 30, status: 'Preparing swap data...' });

        const adjustedMinAmountOut = (BigInt(params.minAmountOut) * swapAmount) / userInputAmount;

        const validatedParams = {
          ...params,
          amountIn: swapAmount.toString(),
          minAmountOut: adjustedMinAmountOut.toString(),
          tokenIn: validatedTokenIn,
          tokenOut: validatedTokenOut,
          voidDexRouterAddress: validatedRouter,
        };
        const swapCallData = encodeSwapCallData(validatedParams);

        const approveCallData = encodeFunctionData({
          abi: [{
            name: 'approve',
            type: 'function',
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
            outputs: [{ name: '', type: 'bool' }],
            stateMutability: 'nonpayable',
          }],
          functionName: 'approve',
          args: [validatedRouter as `0x${string}`, swapAmount],
        });

        const crossContractCalls: ContractTransaction[] = [
          { to: validatedTokenIn, data: approveCallData, value: BigInt(0) },
          { to: validatedRouter, data: swapCallData, value: BigInt(0) },
        ];

        // Prepare unshield amounts
        const relayAdaptUnshieldERC20Amounts: RailgunERC20Amount[] = [];

        if (usingSeparateFeeToken) {
          relayAdaptUnshieldERC20Amounts.push({
            tokenAddress: validatedTokenIn.toLowerCase(),
            amount: userInputAmount,
          });
        } else {
          const unshieldAmount = userInputAmount - broadcasterFee;
          relayAdaptUnshieldERC20Amounts.push({
            tokenAddress: validatedTokenIn.toLowerCase(),
            amount: unshieldAmount,
          });
        }

        // Update gas details with actual estimate
        transactionGasDetails.gasEstimate = actualGasEstimate;

        // ============================================================
        // STEP 6: Prepare broadcaster fee recipient and generate proof
        // ============================================================
        const broadcasterFeeERC20AmountRecipient = {
          tokenAddress: feeTokenAddress.toLowerCase(),
          amount: broadcasterFee,
          recipientAddress: broadcasterInfo.railgunAddress,
        };

        const overallBatchMinGasPrice = effectiveGasPrice; // Use the actual gas price we got from RPC

        // Generate ZK proof
        setProgress({ percent: 35, status: 'Generating zero-knowledge proof...' });

        // Use the network name directly - it's already in the correct format (e.g., 'Ethereum_Sepolia')
        const networkName = network;

        // Generate ZK proof with broadcaster (sendWithPublicWallet: false)
        // This requires POI proof generation
        try {
          await generateCrossContractCallsProof(
            TXIDVersion.V2_PoseidonMerkle,
            networkName as any,
            wallet.id,
            encryptionKey,
            relayAdaptUnshieldERC20Amounts as any,
            [], // No NFTs
            relayAdaptShieldERC20Recipients as any,
            [], // No NFT recipients
            crossContractCalls as any,
            broadcasterFeeERC20AmountRecipient as any, // Broadcaster fee payment
            false, // sendWithPublicWallet - using broadcaster for privacy!
            overallBatchMinGasPrice, // Minimum gas price
            actualGasEstimate, // minGasLimit - use actual SDK estimate
            (proofProgress: number) => {
              const normalizedProgress = 30 + (proofProgress / 100) * 50;
              setProgress({
                percent: normalizedProgress,
                status: `Generating proof... ${proofProgress.toFixed(1)}%`,
              });
            },
          );
        } catch (proofError: unknown) {
          console.error('[Railgun Swap] Proof generation failed:', proofError);
          console.error('[Railgun Swap] Full error:', JSON.stringify(proofError, Object.getOwnPropertyNames(proofError as object)));
          throw proofError;
        }

        // Populate proved transaction
        setProgress({ percent: 85, status: 'Preparing transaction...' });

        const populateResponse = await populateProvedCrossContractCalls(
          TXIDVersion.V2_PoseidonMerkle,
          network as any,
          wallet.id,
          relayAdaptUnshieldERC20Amounts as any,
          [], // No NFTs
          relayAdaptShieldERC20Recipients as any,
          [], // No NFT recipients
          crossContractCalls as any,
          broadcasterFeeERC20AmountRecipient as any, // Broadcaster fee payment
          false, // sendWithPublicWallet - using broadcaster!
          overallBatchMinGasPrice, // Minimum gas price
          transactionGasDetails as any,
        );

        const { transaction, nullifiers, preTransactionPOIsPerTxidLeafPerList } = populateResponse;

        if (!nullifiers || nullifiers.length === 0) {
          throw new Error('No nullifiers returned from populate - cannot submit via broadcaster');
        }

        // Submit transaction to broadcaster
        // Testnet: HTTP API to self-hosted broadcaster
        // Mainnet: Waku P2P to public broadcaster network
        setProgress({ percent: 90, status: 'Submitting to broadcaster...' });

        let hash: string;

        if (isTestnet) {
          // Testnet: Use HTTP API
          const submitResponse = await fetch('/api/broadcaster/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: transaction.to,
              data: transaction.data,
              chainType: chain.type,
              chainId: chain.id,
              minGasPrice: overallBatchMinGasPrice.toString(),
              feesID: broadcasterInfo.feesID,
              useRelayAdapt: true,
              preTransactionPOIsPerTxidLeafPerList,
              txidVersion: TXIDVersion.V2_PoseidonMerkle,
            }),
          });

          const submitResult = await submitResponse.json();

          if (!submitResponse.ok) {
            throw new Error(submitResult.error || 'Transaction submission failed');
          }

          hash = submitResult.txHash;
        } else {
          // Mainnet: Use Waku P2P
          const broadcasterTransaction = await BroadcasterTransaction.create(
            TXIDVersion.V2_PoseidonMerkle,
            transaction.to as string,
            transaction.data as string,
            broadcasterInfo.railgunAddress,
            broadcasterInfo.feesID,
            chain,
            nullifiers,
            overallBatchMinGasPrice,
            true, // useRelayAdapt - always true for cross-contract calls
            preTransactionPOIsPerTxidLeafPerList,
          );

          setProgress({ percent: 95, status: 'Sending via Waku P2P...' });

          hash = await broadcasterTransaction.send();
        }

        setTxHash(hash);
        setProgress({ percent: 98, status: 'Waiting for confirmation...' });

        // Wait for confirmation
        const receipt = await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });

        if (receipt.status === 'reverted') {
          throw new Error('Transaction reverted');
        }

        setProgress({ percent: 100, status: 'Swap complete!' });
        return hash;
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Swap failed';
        setError(errorMessage);
        console.error('[Railgun Swap Error]:', err);
        throw new Error(errorMessage);
      } finally {
        setIsSwapping(false);
        setProgress(null);
      }
    },
    [isReady, wallet, chainId, encryptionKey, publicClient, railgunAddress, feeToken, wethAddress, shieldedBalances, getShieldedBalance],
  );

  return {
    executePrivateSwap,
    estimateGas,
    isSwapping,
    error,
    txHash,
    progress,
    canSwap: isReady && !!wallet && !!encryptionKey,
  };
}

/**
 * Encode swap calldata for VoidDexRouter
 * Uses swapSequential for multi-hop routes, swapMultiRoute for split routes
 */
function encodeSwapCallData(params: RailgunSwapParams): string {
  // Check if this is a sequential multi-hop swap
  if (params.isSequential && params.sequentialSteps && params.sequentialSteps.length > 0) {
    // Sequential multi-hop swap (A->B->C)
    const steps = params.sequentialSteps.map((step) => ({
      dexId: step.dexId as `0x${string}`,
      tokenOut: step.tokenOut as `0x${string}`,
      minAmountOut: BigInt(step.minAmountOut),
      dexData: step.dexData as `0x${string}`,
    }));

    return encodeFunctionData({
      abi: VOID_DEX_ROUTER_SEQUENTIAL_ABI,
      functionName: 'swapSequential',
      args: [
        params.tokenIn as `0x${string}`,
        BigInt(params.amountIn),
        BigInt(params.minAmountOut),
        steps,
      ],
    });
  }

  // Split routing (multiple DEXes with percentages)
  const routeSteps = params.routes.map((route) => ({
    dexId: route.dexId as `0x${string}`,
    percentage: BigInt(route.percentage),
    minAmountOut: BigInt(route.minAmountOut),
    dexData: route.dexData as `0x${string}`,
  }));

  return encodeFunctionData({
    abi: VOID_DEX_ROUTER_ABI,
    functionName: 'swapMultiRoute',
    args: [
      params.tokenIn as `0x${string}`,
      params.tokenOut as `0x${string}`,
      BigInt(params.amountIn),
      BigInt(params.minAmountOut),
      routeSteps,
    ],
  });
}

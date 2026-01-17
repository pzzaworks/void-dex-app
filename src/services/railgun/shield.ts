import {
  NetworkNameType,
  NETWORK_TO_CHAIN,
  getRailgunProxyAddress,
  NetworkName,
} from './constants';

// WETH contract addresses for each network
const WETH_ADDRESSES: Record<string, `0x${string}`> = {
  [NetworkName.Ethereum]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  [NetworkName.Polygon]: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
  [NetworkName.Arbitrum]: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  [NetworkName.BNBChain]: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
  [NetworkName.EthereumSepolia]: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // Sepolia WETH
};

/**
 * Get WETH address for a network
 */
export function getWethAddress(network: NetworkNameType): `0x${string}` | null {
  return WETH_ADDRESSES[network] || null;
}

/**
 * Check if a token address is a native token (ETH, MATIC, BNB)
 */
export function isNativeToken(tokenAddress: string): boolean {
  return (
    tokenAddress === '0x0000000000000000000000000000000000000000' ||
    tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
  );
}

// Types are imported as type-only (no runtime import)
type RailgunERC20AmountRecipient = {
  tokenAddress: string;
  amount: bigint;
  recipientAddress: string;
};

type TransactionGasDetails = {
  gasEstimate: bigint;
  evmGasType: number;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
};

type FeeTokenDetails = {
  tokenAddress: string;
  feePerUnitGas: bigint;
};

export interface ShieldRequest {
  railgunAddress: string; // RAILGUN address (0zk...) to receive shielded tokens
  network: NetworkNameType;
  tokenAddress: string;
  amount: string;
  fromAddress: string; // Public wallet address
  shieldPrivateKey: string; // Shield signature from user
}

export interface UnshieldRequest {
  walletId: string;
  network: NetworkNameType;
  tokenAddress: string;
  amount: string;
  toAddress: string; // Public wallet address
  encryptionKey: string; // Wallet encryption key
}

export interface PrivateTransferRequest {
  walletId: string;
  network: NetworkNameType;
  tokenAddress: string;
  amount: string;
  toRailgunAddress: string; // RAILGUN address (0zk...)
  encryptionKey: string; // Wallet encryption key
  memoText?: string; // Optional encrypted memo
}

export interface ShieldResult {
  transaction: unknown;
  gasEstimate: bigint;
  nullifiers?: string[];
}

export interface UnshieldResult {
  transaction: unknown;
  gasEstimate: bigint;
}

export interface PrivateTransferResult {
  transaction: unknown;
  gasEstimate: bigint;
}

export interface ShieldedTokenBalance {
  tokenAddress: string;
  balance: bigint;
}

/**
 * Get the chain object for RAILGUN SDK
 */
function getChain(network: NetworkNameType) {
  const chainId = NETWORK_TO_CHAIN[network] || 1;
  return { type: 0, id: chainId };
}

/**
 * Get the message that needs to be signed by the user's public wallet to shield tokens
 * This signature proves ownership of the public wallet
 */
export async function getShieldSignatureMessage(): Promise<string> {
  const { getShieldPrivateKeySignatureMessage } = await import('@railgun-community/wallet');
  return getShieldPrivateKeySignatureMessage();
}

/**
 * Shield tokens from public wallet to RAILGUN shielded balance
 * Note: This requires the user to approve ERC-20 tokens and send the transaction via their public wallet
 *
 * Steps:
 * 1. User must approve tokens to RAILGUN proxy contract (done in UI with wagmi)
 * 2. Get shield signature from user's public wallet
 * 3. Estimate gas for shield transaction
 * 4. Populate shield transaction
 * 5. User signs and broadcasts transaction with their public wallet
 */
export async function shieldTokens(request: ShieldRequest): Promise<ShieldResult> {

  // Ensure RAILGUN is initialized
  const { isRailgunInitialized } = await import('./init');
  if (!isRailgunInitialized()) {
    throw new Error('RAILGUN SDK not initialized. Please unlock your wallet first.');
  }

  const { gasEstimateForShield, populateShield } = await import('@railgun-community/wallet');
  const { TXIDVersion } = await import('@railgun-community/shared-models');
  const { loadNetworkProvider } = await import('./init');

  // Ensure provider is loaded for this network
  const providerLoaded = await loadNetworkProvider(request.network);
  if (!providerLoaded) {
    throw new Error(`Failed to load provider for network ${request.network}`);
  }

  // Use the network name directly - it's already a valid NetworkName value
  const networkName = request.network;
  const txidVersion = TXIDVersion.V2_PoseidonMerkle;

  // Prepare ERC-20 amount recipients
  // CRITICAL: Token address MUST be lowercase (how RAILGUN stores it internally)
  const erc20AmountRecipients: RailgunERC20AmountRecipient[] = [
    {
      tokenAddress: request.tokenAddress.toLowerCase(),
      amount: BigInt(request.amount),
      recipientAddress: request.railgunAddress, // RAILGUN address (0zk...) to receive shielded tokens
    },
  ];

  // Step 1: Estimate gas

  const { gasEstimate } = await gasEstimateForShield(
    txidVersion,
    networkName as any, // NetworkNameType is compatible with SDK's NetworkName
    request.shieldPrivateKey,
    erc20AmountRecipients as any,
    [], // No NFTs
    request.fromAddress,
  );

  const gasEstimateBigInt = gasEstimate || BigInt(250000); // Default gas estimate if undefined

  // Step 2: Populate shield transaction
  // Note: gasDetails is optional - SDK will use default values if not provided

  const { transaction, nullifiers } = await populateShield(
    txidVersion,
    networkName as any, // NetworkNameType is compatible with SDK's NetworkName
    request.shieldPrivateKey,
    erc20AmountRecipients as any,
    [], // No NFTs
    undefined, // Let SDK handle gas details
  );

  return {
    transaction,
    gasEstimate: gasEstimateBigInt,
    nullifiers,
  };
}

export interface ShieldBaseTokenRequest {
  railgunAddress: string; // RAILGUN address (0zk...) to receive shielded tokens
  network: NetworkNameType;
  amount: string; // Amount in wei
  fromAddress: string; // Public wallet address
  shieldPrivateKey: string; // Shield signature from user
}

/**
 * Shield base token (ETH/MATIC/BNB) by wrapping to WETH and shielding
 * This uses the RAILGUN Relay Adapt contract to atomically wrap and shield
 *
 * Steps:
 * 1. Get shield signature from user's public wallet
 * 2. Estimate gas for shield transaction
 * 3. Populate shield base token transaction (wraps ETH->WETH and shields atomically)
 * 4. User signs and broadcasts transaction with their public wallet (sending ETH value)
 */
/**
 * Check if a token address is a wrapped base token (WETH, WMATIC, WBNB)
 * These tokens need special handling for unshield (RelayAdapt contract)
 */
export function isWrappedBaseToken(tokenAddress: string, network: NetworkNameType): boolean {
  const wethAddress = getWethAddress(network);
  if (!wethAddress) return false;
  return tokenAddress.toLowerCase() === wethAddress.toLowerCase();
}

export async function shieldBaseToken(request: ShieldBaseTokenRequest): Promise<ShieldResult> {

  // Ensure RAILGUN is initialized
  const { isRailgunInitialized } = await import('./init');
  if (!isRailgunInitialized()) {
    throw new Error('RAILGUN SDK not initialized. Please unlock your wallet first.');
  }

  const { gasEstimateForShieldBaseToken, populateShieldBaseToken } =
    await import('@railgun-community/wallet');
  const { TXIDVersion } = await import('@railgun-community/shared-models');
  const { loadNetworkProvider } = await import('./init');

  // Ensure provider is loaded for this network
  const providerLoaded = await loadNetworkProvider(request.network);
  if (!providerLoaded) {
    throw new Error(`Failed to load provider for network ${request.network}`);
  }

  // Get WETH address for this network
  const wrappedAddress = getWethAddress(request.network);
  if (!wrappedAddress) {
    throw new Error(`WETH/wrapped token address not found for network ${request.network}`);
  }

  const networkName = request.network;
  const txidVersion = TXIDVersion.V2_PoseidonMerkle;

  // Prepare wrapped ERC-20 amount (WETH will be the token after wrapping)
  // Note: For base token shielding, we use RailgunERC20Amount (no recipientAddress)
  // CRITICAL: Token address MUST be lowercase
  const wrappedERC20Amount = {
    tokenAddress: wrappedAddress.toLowerCase(),
    amount: BigInt(request.amount),
  };

  // Step 1: Estimate gas

  const { gasEstimate } = await gasEstimateForShieldBaseToken(
    txidVersion,
    networkName as any,
    request.railgunAddress, // railgunAddress is the 3rd param
    request.shieldPrivateKey,
    wrappedERC20Amount as any,
    request.fromAddress,
  );

  const gasEstimateBigInt = gasEstimate || BigInt(350000); // Higher default for base token

  // Step 2: Populate shield base token transaction

  const { transaction, nullifiers } = await populateShieldBaseToken(
    txidVersion,
    networkName as any,
    request.railgunAddress,
    request.shieldPrivateKey,
    wrappedERC20Amount as any,
    undefined, // Let SDK handle gas details
  );

  return {
    transaction,
    gasEstimate: gasEstimateBigInt,
    nullifiers,
  };
}

/**
 * Unshield tokens from RAILGUN shielded balance to public wallet
 * Uses broadcaster for truly private transactions (no public wallet interaction)
 *
 * Steps:
 * 1. Connect to broadcaster network
 * 2. Calculate broadcaster fee (paid in WETH)
 * 3. Generate ZK proof (takes 20-30 seconds on slower devices)
 * 4. Submit transaction via broadcaster
 */
export async function unshieldTokens(
  request: UnshieldRequest,
  progressCallback?: (progress: number, status: string) => void,
): Promise<UnshieldResult> {

  // Check if engine is initialized
  const { isRailgunInitialized } = await import('./init');
  if (!isRailgunInitialized()) {
    throw new Error('RAILGUN Engine not yet initialized. Please wait...');
  }

  const { gasEstimateForUnprovenUnshield, generateUnshieldProof, populateProvedUnshield, refreshBalances } =
    await import('@railgun-community/wallet');
  const { TXIDVersion } = await import('@railgun-community/shared-models');
  const { loadNetworkProvider } = await import('./init');
  const { ensureBroadcasterReady, findBestBroadcaster } = await import('./relayer');

  // Ensure provider is loaded for this network
  const providerLoaded = await loadNetworkProvider(request.network);
  if (!providerLoaded) {
    throw new Error(`Failed to load provider for network ${request.network}`);
  }

  const txidVersion = TXIDVersion.V2_PoseidonMerkle;
  const chain = getChain(request.network);
  const chainId = NETWORK_TO_CHAIN[request.network];
  const isTestnet = chainId === 11155111; // Sepolia

  // Step 1: Connect to broadcaster network
  progressCallback?.(0.02, 'Connecting to broadcaster network...');
  const broadcasterReady = await ensureBroadcasterReady(request.network);
  if (!broadcasterReady) {
    throw new Error('Failed to connect to broadcaster network. Unshield requires a broadcaster to relay transactions anonymously.');
  }

  // Step 2: Sync merkle tree
  progressCallback?.(0.05, 'Syncing merkle tree...');
  try {
    await refreshBalances(chain, [request.walletId]);
  } catch (rescanErr) {
    console.error('[RAILGUN] Merkle tree sync failed:', rescanErr);
    throw new Error('Failed to sync merkle tree. Please try again.');
  }

  // Get WETH address for this network - fee is always paid in WETH
  const feeTokenAddress = getWethAddress(request.network);
  if (!feeTokenAddress) {
    throw new Error(`WETH not available for network ${request.network}`);
  }

  // Step 3: Find best broadcaster for fee token
  progressCallback?.(0.08, 'Finding broadcaster...');
  const broadcasterInfo = await findBestBroadcaster(request.network, feeTokenAddress.toLowerCase(), false);
  if (!broadcasterInfo) {
    throw new Error('No broadcaster available. Please try again later.');
  }

  // Get correct gas type for this network
  const eip1559Networks = ['Ethereum', 'Polygon', 'Arbitrum', 'Ethereum_Sepolia'];
  const evmGasType = eip1559Networks.includes(request.network) ? 2 : 0;

  // Prepare ERC-20 amount recipients
  const { ethers } = await import('ethers');
  const erc20AmountRecipients: RailgunERC20AmountRecipient[] = [
    {
      tokenAddress: request.tokenAddress.toLowerCase(),
      amount: BigInt(request.amount),
      recipientAddress: ethers.getAddress(request.toAddress),
    },
  ];

  // Step 4: Estimate gas
  progressCallback?.(0.1, 'Estimating gas...');

  const { createSequentialProvider } = await import('@/lib/rpc');
  const provider = await createSequentialProvider(chainId);
  const feeData = await provider.getFeeData();

  if (!feeData.gasPrice) {
    throw new Error('Failed to get gas price from network');
  }

  let gasPrice = feeData.gasPrice;
  let maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice;

  // Testnet gas prices can be extremely low - enforce minimum
  const MIN_GAS_PRICE_WEI = isTestnet ? BigInt(100_000_000) : BigInt(0);
  if (gasPrice < MIN_GAS_PRICE_WEI) {
    gasPrice = MIN_GAS_PRICE_WEI;
    maxFeePerGas = MIN_GAS_PRICE_WEI;
  }

  const MIN_STARTING_GAS_ESTIMATE = BigInt(500000);
  const transactionGasDetails: TransactionGasDetails = isTestnet
    ? { evmGasType: 1, gasEstimate: MIN_STARTING_GAS_ESTIMATE, gasPrice: gasPrice }
    : { evmGasType: 2, gasEstimate: MIN_STARTING_GAS_ESTIMATE, maxFeePerGas: maxFeePerGas, maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || BigInt(1) };

  const feeTokenDetails: FeeTokenDetails = {
    tokenAddress: feeTokenAddress.toLowerCase(),
    feePerUnitGas: broadcasterInfo.feePerUnitGas,
  };

  const gasEstimateResult = await gasEstimateForUnprovenUnshield(
    txidVersion,
    request.network as any,
    request.walletId,
    request.encryptionKey,
    erc20AmountRecipients as any,
    [],
    transactionGasDetails as any,
    feeTokenDetails as any,
    false, // sendWithPublicWallet - using broadcaster!
  );
  const { gasEstimate } = gasEstimateResult;

  const MAX_GAS_ESTIMATE = BigInt(8000000);
  const MIN_GAS_ESTIMATE = BigInt(500000);
  let gasEstimateBigInt = gasEstimate || BigInt(1500000);

  if (gasEstimateBigInt > MAX_GAS_ESTIMATE) {
    gasEstimateBigInt = MAX_GAS_ESTIMATE;
  } else if (gasEstimateBigInt < MIN_GAS_ESTIMATE) {
    gasEstimateBigInt = MIN_GAS_ESTIMATE;
  }

  // Step 5: Calculate broadcaster fee
  const GAS_TOKEN_DECIMALS = 18;
  const FEE_TOKEN_DECIMALS = 18; // WETH
  const feeDecimalRatio = BigInt(10) ** BigInt(GAS_TOKEN_DECIMALS - FEE_TOKEN_DECIMALS);
  const effectiveGasPrice = isTestnet ? gasPrice : maxFeePerGas;
  const maximumGas = gasEstimateBigInt * effectiveGasPrice;
  const broadcasterFee = (broadcasterInfo.feePerUnitGas * maximumGas) / feeDecimalRatio;

  // Broadcaster fee recipient
  const broadcasterFeeERC20AmountRecipient: RailgunERC20AmountRecipient = {
    tokenAddress: feeTokenAddress.toLowerCase(),
    amount: broadcasterFee,
    recipientAddress: broadcasterInfo.railgunAddress,
  };

  // Update gas details with actual estimate
  transactionGasDetails.gasEstimate = gasEstimateBigInt;
  const overallBatchMinGasPrice = effectiveGasPrice;

  // Step 6: Generate ZK proof
  progressCallback?.(0.15, 'Generating zero-knowledge proof...');

  try {
    await generateUnshieldProof(
      txidVersion,
      request.network as any,
      request.walletId,
      request.encryptionKey,
      erc20AmountRecipients as any,
      [],
      broadcasterFeeERC20AmountRecipient as any,
      false, // sendWithPublicWallet - using broadcaster!
      overallBatchMinGasPrice,
      (progress: number) => {
        const normalizedProgress = 0.15 + (progress / 100) * 0.65;
        progressCallback?.(normalizedProgress, `Generating proof... ${progress.toFixed(1)}%`);
      },
    );
  } catch (proofErr) {
    console.error('[RAILGUN] Proof generation FAILED:', proofErr);
    throw new Error(
      `Proof generation failed: ${proofErr instanceof Error ? proofErr.message : 'Unknown error'}`,
    );
  }

  // Step 7: Populate proved unshield transaction
  progressCallback?.(0.85, 'Preparing transaction...');

  const { transaction, nullifiers, preTransactionPOIsPerTxidLeafPerList } = await populateProvedUnshield(
    txidVersion,
    request.network as any,
    request.walletId,
    erc20AmountRecipients as any,
    [],
    broadcasterFeeERC20AmountRecipient as any,
    false, // sendWithPublicWallet - using broadcaster!
    overallBatchMinGasPrice,
    transactionGasDetails as any,
  );

  if (!nullifiers || nullifiers.length === 0) {
    throw new Error('No nullifiers returned from populate - cannot submit via broadcaster');
  }

  // Step 8: Submit transaction to broadcaster
  progressCallback?.(0.9, 'Submitting to broadcaster...');

  let txHash: string;

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
        useRelayAdapt: false,
        preTransactionPOIsPerTxidLeafPerList,
        txidVersion: TXIDVersion.V2_PoseidonMerkle,
      }),
    });

    const submitResult = await submitResponse.json();

    if (!submitResponse.ok) {
      throw new Error(submitResult.error || 'Transaction submission failed');
    }

    txHash = submitResult.txHash;
  } else {
    // Mainnet: Use Waku P2P
    const { BroadcasterTransaction } = await import('@railgun-community/waku-broadcaster-client-web');

    const broadcasterTransaction = await BroadcasterTransaction.create(
      TXIDVersion.V2_PoseidonMerkle,
      transaction.to as string,
      transaction.data as string,
      broadcasterInfo.railgunAddress,
      broadcasterInfo.feesID,
      chain,
      nullifiers,
      overallBatchMinGasPrice,
      false, // useRelayAdapt
      preTransactionPOIsPerTxidLeafPerList,
    );

    progressCallback?.(0.95, 'Sending via Waku P2P...');
    txHash = await broadcasterTransaction.send();
  }

  progressCallback?.(1.0, 'Transaction submitted!');

  return {
    transaction: { ...transaction, hash: txHash },
    gasEstimate: gasEstimateBigInt,
  };
}

/**
 * Unshield base token (WETH/WMATIC/WBNB) from RAILGUN to native token (ETH/MATIC/BNB)
 * Uses RelayAdapt contract to atomically unwrap and transfer
 * Uses broadcaster for truly private transactions (no public wallet interaction)
 *
 * Steps:
 * 1. Connect to broadcaster network
 * 2. Calculate broadcaster fee (paid in WETH)
 * 3. Generate ZK proof (takes 20-30 seconds on slower devices)
 * 4. Submit transaction via broadcaster
 */
export async function unshieldBaseToken(
  request: UnshieldRequest,
  progressCallback?: (progress: number, status: string) => void,
): Promise<UnshieldResult> {

  // Check if engine is initialized
  const { isRailgunInitialized } = await import('./init');
  if (!isRailgunInitialized()) {
    throw new Error('RAILGUN Engine not yet initialized. Please wait...');
  }

  const {
    gasEstimateForUnprovenUnshieldBaseToken,
    generateUnshieldBaseTokenProof,
    populateProvedUnshieldBaseToken,
    refreshBalances,
  } = await import('@railgun-community/wallet');
  const { TXIDVersion } = await import('@railgun-community/shared-models');
  const { loadNetworkProvider } = await import('./init');
  const { ensureBroadcasterReady, findBestBroadcaster } = await import('./relayer');

  // Ensure provider is loaded for this network
  const providerLoaded = await loadNetworkProvider(request.network);
  if (!providerLoaded) {
    throw new Error(`Failed to load provider for network ${request.network}`);
  }

  const txidVersion = TXIDVersion.V2_PoseidonMerkle;
  const chain = getChain(request.network);
  const chainId = NETWORK_TO_CHAIN[request.network];
  const isTestnet = chainId === 11155111; // Sepolia

  // Step 1: Connect to broadcaster network
  progressCallback?.(0.02, 'Connecting to broadcaster network...');
  const broadcasterReady = await ensureBroadcasterReady(request.network);
  if (!broadcasterReady) {
    throw new Error('Failed to connect to broadcaster network. Unshield requires a broadcaster to relay transactions anonymously.');
  }

  // Get WETH address for this network - also used for fee payment
  const wrappedAddress = getWethAddress(request.network);
  if (!wrappedAddress) {
    throw new Error(`WETH/wrapped token address not found for network ${request.network}`);
  }

  // Step 2: Sync merkle tree
  progressCallback?.(0.05, 'Syncing merkle tree...');
  try {
    await refreshBalances(chain, [request.walletId]);
  } catch (rescanErr) {
    console.error('[RAILGUN] Merkle tree sync failed:', rescanErr);
    throw new Error('Failed to sync merkle tree. Please try again.');
  }

  // Step 3: Find best broadcaster for fee token (WETH)
  progressCallback?.(0.08, 'Finding broadcaster...');
  const broadcasterInfo = await findBestBroadcaster(request.network, wrappedAddress.toLowerCase(), true);
  if (!broadcasterInfo) {
    throw new Error('No broadcaster available. Please try again later.');
  }

  // Prepare wrapped ERC-20 amount for unshield
  const { ethers } = await import('ethers');
  const wrappedERC20Amount = {
    tokenAddress: wrappedAddress.toLowerCase(),
    amount: BigInt(request.amount),
  };

  const publicWalletAddress = ethers.getAddress(request.toAddress);

  // Step 4: Estimate gas
  progressCallback?.(0.1, 'Estimating gas...');

  const { createSequentialProvider } = await import('@/lib/rpc');
  const provider = await createSequentialProvider(chainId);
  const feeData = await provider.getFeeData();

  if (!feeData.gasPrice) {
    throw new Error('Failed to get gas price from network');
  }

  let gasPrice = feeData.gasPrice;
  let maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice;

  // Testnet gas prices can be extremely low - enforce minimum
  const MIN_GAS_PRICE_WEI = isTestnet ? BigInt(100_000_000) : BigInt(0);
  if (gasPrice < MIN_GAS_PRICE_WEI) {
    gasPrice = MIN_GAS_PRICE_WEI;
    maxFeePerGas = MIN_GAS_PRICE_WEI;
  }

  const MIN_STARTING_GAS_ESTIMATE = BigInt(600000);
  const transactionGasDetails: TransactionGasDetails = isTestnet
    ? { evmGasType: 1, gasEstimate: MIN_STARTING_GAS_ESTIMATE, gasPrice: gasPrice }
    : { evmGasType: 2, gasEstimate: MIN_STARTING_GAS_ESTIMATE, maxFeePerGas: maxFeePerGas, maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || BigInt(1) };

  const feeTokenDetails: FeeTokenDetails = {
    tokenAddress: wrappedAddress.toLowerCase(),
    feePerUnitGas: broadcasterInfo.feePerUnitGas,
  };

  const gasEstimateResult = await gasEstimateForUnprovenUnshieldBaseToken(
    txidVersion,
    request.network as any,
    publicWalletAddress,
    request.walletId,
    request.encryptionKey,
    wrappedERC20Amount as any,
    transactionGasDetails as any,
    feeTokenDetails as any,
    false, // sendWithPublicWallet - using broadcaster!
  );
  let gasEstimateBigInt = gasEstimateResult.gasEstimate || BigInt(600000);

  // Cap gas estimate
  const MAX_GAS_ESTIMATE = BigInt(8000000);
  const MIN_GAS_ESTIMATE = BigInt(500000);
  if (gasEstimateBigInt > MAX_GAS_ESTIMATE) gasEstimateBigInt = MAX_GAS_ESTIMATE;
  if (gasEstimateBigInt < MIN_GAS_ESTIMATE) gasEstimateBigInt = MIN_GAS_ESTIMATE;

  // Step 5: Calculate broadcaster fee
  const GAS_TOKEN_DECIMALS = 18;
  const FEE_TOKEN_DECIMALS = 18; // WETH
  const feeDecimalRatio = BigInt(10) ** BigInt(GAS_TOKEN_DECIMALS - FEE_TOKEN_DECIMALS);
  const effectiveGasPrice = isTestnet ? gasPrice : maxFeePerGas;
  const maximumGas = gasEstimateBigInt * effectiveGasPrice;
  const broadcasterFee = (broadcasterInfo.feePerUnitGas * maximumGas) / feeDecimalRatio;

  // Broadcaster fee recipient
  const broadcasterFeeERC20AmountRecipient: RailgunERC20AmountRecipient = {
    tokenAddress: wrappedAddress.toLowerCase(),
    amount: broadcasterFee,
    recipientAddress: broadcasterInfo.railgunAddress,
  };

  // Update gas details with actual estimate
  transactionGasDetails.gasEstimate = gasEstimateBigInt;
  const overallBatchMinGasPrice = effectiveGasPrice;

  // Step 6: Generate ZK proof
  progressCallback?.(0.15, 'Generating zero-knowledge proof...');

  try {
    await generateUnshieldBaseTokenProof(
      txidVersion,
      request.network as any,
      publicWalletAddress,
      request.walletId,
      request.encryptionKey,
      wrappedERC20Amount as any,
      broadcasterFeeERC20AmountRecipient as any,
      false, // sendWithPublicWallet - using broadcaster!
      overallBatchMinGasPrice,
      (progress: number) => {
        const normalizedProgress = 0.15 + (progress / 100) * 0.65;
        progressCallback?.(normalizedProgress, `Generating proof... ${progress.toFixed(1)}%`);
      },
    );
  } catch (proofErr) {
    console.error('[RAILGUN] Base token proof generation FAILED:', proofErr);
    throw new Error(
      `Proof generation failed: ${proofErr instanceof Error ? proofErr.message : 'Unknown error'}`,
    );
  }

  // Step 7: Populate proved unshield base token transaction
  progressCallback?.(0.85, 'Preparing transaction...');

  const { transaction, nullifiers, preTransactionPOIsPerTxidLeafPerList } = await populateProvedUnshieldBaseToken(
    txidVersion,
    request.network as any,
    publicWalletAddress,
    request.walletId,
    wrappedERC20Amount as any,
    broadcasterFeeERC20AmountRecipient as any,
    false, // sendWithPublicWallet - using broadcaster!
    overallBatchMinGasPrice,
    transactionGasDetails as any,
  );

  if (!nullifiers || nullifiers.length === 0) {
    throw new Error('No nullifiers returned from populate - cannot submit via broadcaster');
  }

  // Step 8: Submit transaction to broadcaster
  progressCallback?.(0.9, 'Submitting to broadcaster...');

  let txHash: string;

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
        useRelayAdapt: true, // Base token unshield uses RelayAdapt
        preTransactionPOIsPerTxidLeafPerList,
        txidVersion: TXIDVersion.V2_PoseidonMerkle,
      }),
    });

    const submitResult = await submitResponse.json();

    if (!submitResponse.ok) {
      throw new Error(submitResult.error || 'Transaction submission failed');
    }

    txHash = submitResult.txHash;
  } else {
    // Mainnet: Use Waku P2P
    const { BroadcasterTransaction } = await import('@railgun-community/waku-broadcaster-client-web');

    const broadcasterTransaction = await BroadcasterTransaction.create(
      TXIDVersion.V2_PoseidonMerkle,
      transaction.to as string,
      transaction.data as string,
      broadcasterInfo.railgunAddress,
      broadcasterInfo.feesID,
      chain,
      nullifiers,
      overallBatchMinGasPrice,
      true, // useRelayAdapt - true for base token unshield
      preTransactionPOIsPerTxidLeafPerList,
    );

    progressCallback?.(0.95, 'Sending via Waku P2P...');
    txHash = await broadcasterTransaction.send();
  }

  progressCallback?.(1.0, 'Transaction submitted!');

  return {
    transaction: { ...transaction, hash: txHash },
    gasEstimate: gasEstimateBigInt,
  };
}

/**
 * Private transfer between RAILGUN wallets
 * Transfers tokens from one shielded balance to another RAILGUN address
 * Uses broadcaster for truly private transactions (no public wallet interaction)
 *
 * Steps:
 * 1. Connect to broadcaster network
 * 2. Calculate broadcaster fee
 * 3. Generate ZK proof (takes 20-30 seconds on slower devices)
 * 4. Submit transaction via broadcaster
 */
export async function privateTransfer(
  request: PrivateTransferRequest,
  progressCallback?: (progress: number, status: string) => void,
): Promise<PrivateTransferResult> {

  // Check if engine is initialized
  const { isRailgunInitialized } = await import('./init');
  if (!isRailgunInitialized()) {
    throw new Error('RAILGUN Engine not yet initialized. Please wait...');
  }

  const { gasEstimateForUnprovenTransfer, generateTransferProof, populateProvedTransfer, refreshBalances } =
    await import('@railgun-community/wallet');
  const { TXIDVersion } = await import('@railgun-community/shared-models');
  const { loadNetworkProvider } = await import('./init');
  const { ensureBroadcasterReady, findBestBroadcaster } = await import('./relayer');

  // Ensure provider is loaded for this network
  const providerLoaded = await loadNetworkProvider(request.network);
  if (!providerLoaded) {
    throw new Error(`Failed to load provider for network ${request.network}`);
  }

  const txidVersion = TXIDVersion.V2_PoseidonMerkle;
  const chain = getChain(request.network);
  const chainId = NETWORK_TO_CHAIN[request.network];
  const isTestnet = chainId === 11155111; // Sepolia

  // Step 1: Connect to broadcaster network
  progressCallback?.(0.02, 'Connecting to broadcaster network...');
  const broadcasterReady = await ensureBroadcasterReady(request.network);
  if (!broadcasterReady) {
    throw new Error('Failed to connect to broadcaster network. Private transfers require a broadcaster to relay transactions anonymously.');
  }

  // Step 2: Sync merkle tree to ensure we have latest UTXOs
  progressCallback?.(0.05, 'Syncing merkle tree...');
  try {
    await refreshBalances(chain, [request.walletId]);
  } catch (rescanErr) {
    console.error('[RAILGUN] Merkle tree sync failed:', rescanErr);
    throw new Error('Failed to sync merkle tree. Please try again.');
  }

  // Get correct gas type for this network
  const eip1559Networks = ['Ethereum', 'Polygon', 'Arbitrum', 'Ethereum_Sepolia'];
  const evmGasType = eip1559Networks.includes(request.network) ? 2 : 0;

  // Get WETH address for this network - fee is always paid in WETH
  const feeTokenAddress = getWethAddress(request.network);
  if (!feeTokenAddress) {
    throw new Error(`WETH not available for network ${request.network}`);
  }

  // Step 3: Find best broadcaster for fee token
  progressCallback?.(0.08, 'Finding broadcaster...');
  const broadcasterInfo = await findBestBroadcaster(request.network, feeTokenAddress.toLowerCase(), false);
  if (!broadcasterInfo) {
    throw new Error('No broadcaster available. Please try again later.');
  }

  // Prepare ERC-20 amount recipients
  // CRITICAL: Token address MUST be lowercase (how RAILGUN stores it internally)
  const erc20AmountRecipients: RailgunERC20AmountRecipient[] = [
    {
      tokenAddress: request.tokenAddress.toLowerCase(),
      amount: BigInt(request.amount),
      recipientAddress: request.toRailgunAddress, // RAILGUN address (0zk...)
    },
  ];

  // Step 4: Estimate gas for unproven transfer
  progressCallback?.(0.1, 'Estimating gas...');

  // Get gas prices
  const { createSequentialProvider } = await import('@/lib/rpc');
  const provider = await createSequentialProvider(chainId);
  const feeData = await provider.getFeeData();

  if (!feeData.gasPrice) {
    throw new Error('Failed to get gas price from network');
  }

  let gasPrice = feeData.gasPrice;
  let maxFeePerGas = feeData.maxFeePerGas || feeData.gasPrice;

  // Testnet gas prices can be extremely low - enforce minimum
  const MIN_GAS_PRICE_WEI = isTestnet ? BigInt(100_000_000) : BigInt(0); // 0.1 gwei for testnet
  if (gasPrice < MIN_GAS_PRICE_WEI) {
    gasPrice = MIN_GAS_PRICE_WEI;
    maxFeePerGas = MIN_GAS_PRICE_WEI;
  }

  const MIN_STARTING_GAS_ESTIMATE = BigInt(500000);
  const transactionGasDetails: TransactionGasDetails = isTestnet
    ? { evmGasType: 1, gasEstimate: MIN_STARTING_GAS_ESTIMATE, gasPrice: gasPrice }
    : { evmGasType: 2, gasEstimate: MIN_STARTING_GAS_ESTIMATE, maxFeePerGas: maxFeePerGas, maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || BigInt(1) };

  const feeTokenDetails: FeeTokenDetails = {
    tokenAddress: feeTokenAddress.toLowerCase(),
    feePerUnitGas: broadcasterInfo.feePerUnitGas,
  };

  const { gasEstimate } = await gasEstimateForUnprovenTransfer(
    txidVersion,
    request.network as any,
    request.walletId,
    request.encryptionKey,
    request.memoText || undefined,
    erc20AmountRecipients as any,
    [], // No NFTs
    transactionGasDetails as any,
    feeTokenDetails as any,
    false, // sendWithPublicWallet - using broadcaster!
  );

  // Cap gas estimate to reasonable limits
  const MAX_GAS_ESTIMATE = BigInt(8000000);
  const MIN_GAS_ESTIMATE = BigInt(400000);
  let gasEstimateBigInt = gasEstimate || BigInt(500000);

  if (gasEstimateBigInt > MAX_GAS_ESTIMATE) {
    gasEstimateBigInt = MAX_GAS_ESTIMATE;
  } else if (gasEstimateBigInt < MIN_GAS_ESTIMATE) {
    gasEstimateBigInt = MIN_GAS_ESTIMATE;
  }

  // Step 5: Calculate broadcaster fee
  const GAS_TOKEN_DECIMALS = 18;
  const FEE_TOKEN_DECIMALS = 18; // WETH
  const feeDecimalRatio = BigInt(10) ** BigInt(GAS_TOKEN_DECIMALS - FEE_TOKEN_DECIMALS);
  const effectiveGasPrice = isTestnet ? gasPrice : maxFeePerGas;
  const maximumGas = gasEstimateBigInt * effectiveGasPrice;
  const broadcasterFee = (broadcasterInfo.feePerUnitGas * maximumGas) / feeDecimalRatio;

  // Broadcaster fee recipient
  const broadcasterFeeERC20AmountRecipient: RailgunERC20AmountRecipient = {
    tokenAddress: feeTokenAddress.toLowerCase(),
    amount: broadcasterFee,
    recipientAddress: broadcasterInfo.railgunAddress,
  };

  // Update gas details with actual estimate
  transactionGasDetails.gasEstimate = gasEstimateBigInt;
  const overallBatchMinGasPrice = effectiveGasPrice;

  // Step 6: Generate ZK proof
  progressCallback?.(0.15, 'Generating zero-knowledge proof...');

  try {
    await generateTransferProof(
      txidVersion,
      request.network as any,
      request.walletId,
      request.encryptionKey,
      true, // showSenderAddressToRecipient
      request.memoText || undefined,
      erc20AmountRecipients as any,
      [], // No NFTs
      broadcasterFeeERC20AmountRecipient as any, // Broadcaster fee payment
      false, // sendWithPublicWallet - using broadcaster!
      overallBatchMinGasPrice, // Minimum gas price
      (progress: number) => {
        const normalizedProgress = 0.15 + (progress / 100) * 0.65;
        progressCallback?.(normalizedProgress, `Generating proof... ${progress.toFixed(1)}%`);
      },
    );
  } catch (proofErr) {
    console.error('[RAILGUN] Transfer proof generation FAILED:', proofErr);
    throw new Error(
      `Proof generation failed: ${proofErr instanceof Error ? proofErr.message : 'Unknown error'}`,
    );
  }

  // Step 7: Populate proved transfer transaction
  progressCallback?.(0.85, 'Preparing transaction...');

  const { transaction, nullifiers, preTransactionPOIsPerTxidLeafPerList } = await populateProvedTransfer(
    txidVersion,
    request.network as any,
    request.walletId,
    true, // showSenderAddressToRecipient
    request.memoText || undefined,
    erc20AmountRecipients as any,
    [], // No NFTs
    broadcasterFeeERC20AmountRecipient as any, // Broadcaster fee payment
    false, // sendWithPublicWallet - using broadcaster!
    overallBatchMinGasPrice,
    transactionGasDetails as any,
  );

  if (!nullifiers || nullifiers.length === 0) {
    throw new Error('No nullifiers returned from populate - cannot submit via broadcaster');
  }

  // Step 8: Submit transaction to broadcaster
  progressCallback?.(0.9, 'Submitting to broadcaster...');

  let txHash: string;

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
        useRelayAdapt: false, // Transfer doesn't use RelayAdapt
        preTransactionPOIsPerTxidLeafPerList,
        txidVersion: TXIDVersion.V2_PoseidonMerkle,
      }),
    });

    const submitResult = await submitResponse.json();

    if (!submitResponse.ok) {
      throw new Error(submitResult.error || 'Transaction submission failed');
    }

    txHash = submitResult.txHash;
  } else {
    // Mainnet: Use Waku P2P
    const { BroadcasterTransaction } = await import('@railgun-community/waku-broadcaster-client-web');

    const broadcasterTransaction = await BroadcasterTransaction.create(
      TXIDVersion.V2_PoseidonMerkle,
      transaction.to as string,
      transaction.data as string,
      broadcasterInfo.railgunAddress,
      broadcasterInfo.feesID,
      chain,
      nullifiers,
      overallBatchMinGasPrice,
      false, // useRelayAdapt - false for transfers
      preTransactionPOIsPerTxidLeafPerList,
    );

    progressCallback?.(0.95, 'Sending via Waku P2P...');
    txHash = await broadcasterTransaction.send();
  }

  progressCallback?.(1.0, 'Transaction submitted!');

  return {
    transaction: { ...transaction, hash: txHash },
    gasEstimate: gasEstimateBigInt,
  };
}

/**
 * Balance info including pending status
 */
export interface TokenBalanceInfo {
  total: bigint;
  spendable: bigint;
  pending: bigint; // total - spendable (waiting for POI)
}

/**
 * Get shielded token balances for a wallet
 * Uses balanceForERC20Token to query individual token balances
 * Returns both total and spendable balances to show pending POI status
 */
export async function getShieldedBalances(
  walletId: string,
  network: NetworkNameType,
  tokenAddresses: string[] = [],
): Promise<Map<string, bigint>> {
  const result = new Map<string, bigint>();

  try {
    const { walletForID, balanceForERC20Token } = await import('@railgun-community/wallet');
    const { TXIDVersion } = await import('@railgun-community/shared-models');

    // Get the wallet object
    const wallet = walletForID(walletId);
    if (!wallet) {
      console.warn('[RAILGUN] Wallet not found for ID:', walletId);
      return result;
    }

    const txidVersion = TXIDVersion.V2_PoseidonMerkle;

    // If we shielded ETH, it becomes WETH - always check WETH balance
    const wethAddress = getWethAddress(network);
    const addressesToCheck = new Set<string>(tokenAddresses.map((a) => a.toLowerCase()));

    // Always add WETH to check list
    if (wethAddress) {
      addressesToCheck.add(wethAddress.toLowerCase());
    }

    // Query balance for each token
    for (const tokenAddress of addressesToCheck) {
      try {
        // Get total balance (including pending)
        const totalBalance = await balanceForERC20Token(
          txidVersion,
          wallet,
          network as any, // NetworkName
          tokenAddress,
          false, // onlySpendable=false to include pending balances
        );

        // Spendable balance can be fetched if needed for POI status
        // const spendableBalance = await balanceForERC20Token(txidVersion, wallet, network as any, tokenAddress, true);

        if (totalBalance > BigInt(0)) {
          result.set(tokenAddress.toLowerCase(), totalBalance);
        }
      } catch (err) {
        console.warn(`[RAILGUN] Failed to get balance for ${tokenAddress}:`, err);
      }
    }

    return result;
  } catch (err) {
    console.warn('[RAILGUN] Failed to get shielded balances:', err);
    return result;
  }
}

// Global rate limiter for balance fetches to prevent duplicate requests
const lastBalanceFetch: Record<string, number> = {};
const balanceFetchInProgress: Record<string, Promise<Map<string, TokenBalanceInfo>>> = {};
const cachedBalances: Record<string, Map<string, TokenBalanceInfo>> = {};

/**
 * Get detailed shielded token balances including pending status
 * Shows total, spendable, and pending (waiting for POI) amounts
 * If tokenAddresses is empty, returns all tokens with non-zero balance
 */
export async function getShieldedBalancesDetailed(
  walletId: string,
  network: NetworkNameType,
  tokenAddresses: string[] = [],
): Promise<Map<string, TokenBalanceInfo>> {
  const cacheKey = `${walletId}-${network}`;
  const now = Date.now();

  // Return cached promise if fetch is in progress
  const inProgressPromise = balanceFetchInProgress[cacheKey];
  if (inProgressPromise !== undefined) {
    return inProgressPromise;
  }

  // Rate limit: 30 seconds between fetches for same wallet/network
  // Return cached data instead of empty map to preserve balance display
  if (lastBalanceFetch[cacheKey] && now - lastBalanceFetch[cacheKey] < 30000) {
    return cachedBalances[cacheKey] || new Map<string, TokenBalanceInfo>();
  }

  const result = new Map<string, TokenBalanceInfo>();

  const fetchPromise = (async () => {
    try {
      const { walletForID, balanceForERC20Token } = await import('@railgun-community/wallet');
      const { TXIDVersion } = await import('@railgun-community/shared-models');

      // Get the wallet object
      const wallet = walletForID(walletId);
      if (!wallet) {
        console.warn('[RAILGUN] Wallet not found for ID:', walletId);
        return result;
      }

      const txidVersion = TXIDVersion.V2_PoseidonMerkle;

      // Build list of addresses to check - token addresses passed from API
      const addressesToCheck = new Set<string>(tokenAddresses.map((a) => a.toLowerCase()));

      // Always add WETH for this network (shielded ETH becomes WETH)
      const wethAddress = getWethAddress(network);
      if (wethAddress) {
        addressesToCheck.add(wethAddress.toLowerCase());
      }

      // Try to get additional token addresses from wallet's transaction history
      try {
        // @ts-expect-error - wallet has erc20Amounts property
        const walletBalances = wallet.balances;
        if (walletBalances) {
          const chainBalances = walletBalances[txidVersion]?.[network];
          if (chainBalances?.erc20Amounts) {
            for (const tokenData of chainBalances.erc20Amounts) {
              if (tokenData.tokenAddress) {
                addressesToCheck.add(tokenData.tokenAddress.toLowerCase());
              }
            }
          }
        }
      } catch {
        // Silently ignore - will check known tokens anyway
      }

      // Query balance for each token
      for (const tokenAddress of addressesToCheck) {
        try {
          // Get total balance (including pending)
          const totalBalance = await balanceForERC20Token(
            txidVersion,
            wallet,
            network as any,
            tokenAddress,
            false,
          );

          // Get spendable balance (POI verified)
          const spendableBalance = await balanceForERC20Token(
            txidVersion,
            wallet,
            network as any,
            tokenAddress,
            true,
          );

          const pendingBalance = totalBalance - spendableBalance;

          if (totalBalance > BigInt(0)) {
            result.set(tokenAddress.toLowerCase(), {
              total: totalBalance,
              spendable: spendableBalance,
              pending: pendingBalance,
            });
          }
        } catch (err) {
          console.warn(`[RAILGUN] Failed to get balance for ${tokenAddress}:`, err);
        }
      }

      // Cache the result for rate-limited requests
      cachedBalances[cacheKey] = result;
      return result;
    } catch (err) {
      console.warn('[RAILGUN] Failed to get shielded balances:', err);
      return result;
    } finally {
      delete balanceFetchInProgress[cacheKey];
    }
  })();

  // Track in-progress fetch and update timestamp
  balanceFetchInProgress[cacheKey] = fetchPromise;
  lastBalanceFetch[cacheKey] = now;

  return fetchPromise;
}

/**
 * Get RAILGUN contract address for token approvals
 * Returns the Proxy contract address which is the main entry point for shield/unshield
 */
export async function getRailgunContractAddress(network: NetworkNameType): Promise<string> {
  return await getRailgunProxyAddress(network);
}

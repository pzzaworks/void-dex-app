// RAILGUN Privacy SDK Integration for VoidDEX

// Initialization
export {
  initializeRailgun,
  isRailgunInitialized,
  shutdownRailgun,
  onBalanceUpdate,
  onScanProgress,
  loadNetworkProvider,
  isProviderLoaded,
  ensureArtifactsDownloaded,
  hasNetworkArtifacts,
} from './init';

// Wallet management
export {
  generateMnemonic,
  generateMnemonicAsync,
  validateMnemonic,
  validateMnemonicAsync,
  createPrivateWallet,
  loadPrivateWallet,
  loadPrivateWalletWithKey,
  unloadPrivateWallet,
  getPrivateWalletMnemonic,
  refreshPrivateBalances,
  rescanPrivateWallet,
  scanAndRefreshBalances,
  getStoredWalletInfo,
  clearStoredWalletInfo,
  hasStoredWallet,
  getRailgunAddressForChain,
} from './wallet';

// Shield/Unshield/Transfer
export {
  shieldTokens,
  shieldBaseToken,
  unshieldTokens,
  unshieldBaseToken,
  privateTransfer,
  getShieldedBalances,
  getShieldedBalancesDetailed,
  getRailgunContractAddress,
  getShieldSignatureMessage,
  getWethAddress,
  isNativeToken,
  isWrappedBaseToken,
} from './shield';

// Types
export type { RailgunWalletInfo, RailgunWalletWithKey } from './wallet';
export type {
  ShieldRequest,
  ShieldBaseTokenRequest,
  UnshieldRequest,
  PrivateTransferRequest,
  ShieldResult,
  UnshieldResult,
  PrivateTransferResult,
  TokenBalanceInfo,
} from './shield';

// Constants
export {
  NetworkName,
  SUPPORTED_NETWORKS,
  CHAIN_TO_NETWORK,
  NETWORK_TO_CHAIN,
  getNetworkForChain,
  getRailgunProxyAddress,
  getRailgunRelayAdaptAddress,
  getNetworkDisplayName,
} from './constants';

export type { NetworkNameType } from './constants';

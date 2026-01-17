'use client';

import { TokenSelector, Token } from '../TokenSelector';
import { AmountInput } from '../AmountInput';
import { AddressInput } from '../AddressInput';
import { InfoBox } from '../InfoBox';

interface InputStepProps {
  mode: 'shield' | 'unshield';
  selectedToken: Token | null;
  tokens: Token[];
  onTokenSelect: (token: Token) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  publicAddress: string;
  onAddressChange: (value: string) => void;
  shieldedBalance: bigint;
  publicBalance: bigint;
  formatBalance: (balance: bigint, decimals: number) => string;
  getBalance: (address: string) => bigint;
  onMax: () => void;
  onSubmit: () => void;
  error: string | null;
  hasWallet: boolean;
  canUnlock?: boolean;
  isRailgunLoading?: boolean;
  onUnlockWallet: () => void;
  balancesLoading?: boolean;
  providerLoading?: boolean; // True when privacy system is preparing (artifacts + provider)
  hasArtifactsCached?: boolean; // True if cryptographic files are already downloaded
}

export function InputStep({
  mode,
  selectedToken,
  tokens,
  onTokenSelect,
  amount,
  onAmountChange,
  publicAddress,
  onAddressChange,
  shieldedBalance,
  publicBalance,
  formatBalance,
  getBalance,
  onMax,
  onSubmit,
  error,
  hasWallet,
  canUnlock = true,
  isRailgunLoading = false,
  onUnlockWallet,
  balancesLoading = false,
  providerLoading = false,
  hasArtifactsCached = false,
}: InputStepProps) {
  // Shield mode: no address check needed (uses connected wallet)
  // Unshield mode: publicAddress is optional (defaults to connected wallet)
  // Wallet must be unlocked to perform shield/unshield
  const isSubmitDisabled = !selectedToken || !amount || parseFloat(amount) <= 0 || !hasWallet || providerLoading;

  return (
    <div className="space-y-4">
      {/* Description */}
      <p className="text-sm text-void-muted">
        {mode === 'shield'
          ? 'Move tokens from your public wallet to your private RAILGUN balance.'
          : 'Move tokens from your private RAILGUN balance to a public wallet.'}
      </p>

      {/* Privacy System Loading State */}
      {hasWallet && providerLoading && (
        <div className="bg-void-gray/50 border border-void-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-void-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-void-white">
                {hasArtifactsCached ? 'Connecting to Privacy Network' : 'Preparing Privacy System'}
              </p>
              <p className="text-xs text-void-muted mt-0.5">
                {hasArtifactsCached
                  ? 'Syncing with the blockchain...'
                  : 'Downloading cryptographic files for secure transactions...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Token Selector */}
      <TokenSelector
        selectedToken={selectedToken}
        tokens={tokens}
        onTokenSelect={onTokenSelect}
        showBalance={true}
        mode={mode}
        getBalance={getBalance}
        formatBalance={formatBalance}
      />

      {/* Amount Input */}
      <AmountInput
        amount={amount}
        onAmountChange={onAmountChange}
        selectedToken={selectedToken}
        mode={mode}
        shieldedBalance={shieldedBalance}
        publicBalance={publicBalance}
        formatBalance={formatBalance}
        onMax={onMax}
        onSubmit={hasWallet && !isSubmitDisabled ? onSubmit : undefined}
        balancesLoading={balancesLoading}
      />

      {/* Address Input */}
      <AddressInput mode={mode} publicAddress={publicAddress} onAddressChange={onAddressChange} />

      {/* Info Box */}
      <InfoBox mode={mode} />

      {/* Error Display */}
      {error && <div className="text-sm text-red-400">{error}</div>}

      {/* Submit Button or Unlock Wallet Button */}
      {!hasWallet ? (
        <button
          onClick={canUnlock ? onUnlockWallet : undefined}
          disabled={!canUnlock}
          className={`w-full py-3 rounded-xl font-semibold transition-all ${
            canUnlock
              ? 'bg-void-accent hover:bg-void-accent-hover text-void-black cursor-pointer'
              : 'bg-void-gray text-void-muted cursor-not-allowed'
          }`}
        >
          {isRailgunLoading ? 'Initializing...' : 'Unlock Wallet'}
        </button>
      ) : (
        <button
          onClick={onSubmit}
          disabled={isSubmitDisabled}
          className={`w-full py-3 rounded-xl font-semibold transition-all ${
            isSubmitDisabled
              ? 'bg-void-gray text-void-muted cursor-not-allowed'
              : 'bg-void-accent hover:bg-void-accent-hover text-void-black'
          }`}
        >
          {mode === 'shield' ? 'Shield Tokens' : 'Unshield Tokens'}
        </button>
      )}
    </div>
  );
}

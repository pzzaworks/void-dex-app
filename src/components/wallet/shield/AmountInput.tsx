'use client';

import { Token } from './TokenSelector';

interface AmountInputProps {
  amount: string;
  onAmountChange: (value: string) => void;
  selectedToken: Token | null;
  mode: 'shield' | 'unshield';
  shieldedBalance?: bigint;
  publicBalance?: bigint;
  formatBalance?: (balance: bigint, decimals: number) => string;
  onMax: () => void;
  onSubmit?: () => void;
  balancesLoading?: boolean;
}

export function AmountInput({
  amount,
  onAmountChange,
  selectedToken,
  mode,
  shieldedBalance,
  publicBalance,
  formatBalance,
  onMax,
  onSubmit,
  balancesLoading = false,
}: AmountInputProps) {
  // Get the appropriate balance based on mode
  const displayBalance = mode === 'shield' ? publicBalance : shieldedBalance;
  const balanceLabel = mode === 'shield' ? 'Public' : 'Shielded';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm text-void-muted">Amount</label>
        {selectedToken && (
          <div className="text-xs text-void-muted">
            {balancesLoading && mode === 'unshield' ? (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 border border-void-accent border-t-transparent rounded-full animate-spin" />
                Syncing...
              </span>
            ) : displayBalance !== undefined && formatBalance ? (
              <>
                {balanceLabel}: {formatBalance(displayBalance, selectedToken.decimals)}{' '}
                {selectedToken.symbol}
              </>
            ) : null}
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
              onAmountChange(val);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSubmit) {
              onSubmit();
            }
          }}
          placeholder="0.0"
          className="w-full px-4 py-3 bg-void-gray rounded-xl text-void-white placeholder:text-void-muted focus:outline-none focus:ring-1 focus:ring-void-accent pr-20"
        />
        <button
          onClick={onMax}
          className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-void-accent hover:bg-void-accent/10 rounded transition-colors"
        >
          MAX
        </button>
      </div>
    </div>
  );
}

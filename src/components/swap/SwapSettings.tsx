'use client';

import { useFeeSettings } from '@/providers/FeeSettingsProvider';
import { useRailgun } from '@/providers/RailgunProvider';
import Image from 'next/image';

interface SwapSettingsProps {
  slippage: string;
  setSlippage: (value: string) => void;
}

const SLIPPAGE_OPTIONS = ['0.1', '0.5', '1.0'];

export function SwapSettings({ slippage, setSlippage }: SwapSettingsProps) {
  const { shieldedBalances } = useRailgun();
  const { feeToken } = useFeeSettings();

  // Get balance for WETH (max 6 decimals)
  const getWethBalance = (): string => {
    if (!feeToken) return '0';
    const balance = shieldedBalances.get(feeToken.address.toLowerCase());
    if (!balance) return '0';
    const num = parseFloat(balance.spendableFormatted);
    if (num === 0) return '0';
    return num.toFixed(6).replace(/\.?0+$/, '');
  };

  return (
    <div className="p-4 bg-void-gray rounded-xl space-y-4">
      {/* Slippage - Vertical Layout */}
      <div>
        <span className="text-sm text-void-muted block mb-2">Slippage Tolerance</span>
        <div className="flex items-center gap-2">
          {SLIPPAGE_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => setSlippage(option)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                slippage === option
                  ? 'bg-void-accent text-void-black'
                  : 'bg-void-light text-void-muted hover:text-void-white'
              }`}
            >
              {option}%
            </button>
          ))}
          <div className="w-20 relative">
            <input
              type="text"
              value={slippage}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                  setSlippage(val);
                }
              }}
              placeholder="Custom"
              className="w-full px-3 py-2.5 bg-void-light rounded-lg text-sm text-void-white text-center focus:outline-none focus:ring-1 focus:ring-void-accent"
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-void-border" />

      {/* Fee Token Display (WETH only - no selection) */}
      <div>
        <span className="text-sm text-void-muted block mb-2">Broadcaster Fee Token</span>
        <div className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-void-light rounded-lg">
          <div className="flex items-center gap-3">
            {feeToken ? (
              <>
                <Image
                  src={feeToken.icon}
                  alt={feeToken.symbol}
                  width={28}
                  height={28}
                  className="rounded-full"
                />
                <span className="text-base text-void-white font-medium">{feeToken.symbol}</span>
                <span className="text-sm text-void-muted">
                  Balance: {getWethBalance()}
                </span>
              </>
            ) : (
              <span className="text-base text-void-muted">WETH</span>
            )}
          </div>
        </div>
        <p className="text-xs text-void-muted mt-2">
          Fee is always paid in {feeToken?.symbol || 'WETH'}. If you don&apos;t have enough, it will be swapped from your input token.
        </p>
      </div>
    </div>
  );
}

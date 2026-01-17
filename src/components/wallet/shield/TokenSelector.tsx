'use client';

import { useState } from 'react';
import Image from 'next/image';
import { HiChevronDown } from 'react-icons/hi2';

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  icon: string;
}

interface TokenSelectorProps {
  selectedToken: Token | null;
  tokens: Token[];
  onTokenSelect: (token: Token) => void;
  showBalance?: boolean;
  mode?: 'shield' | 'unshield';
  getBalance?: (address: string) => bigint;
  formatBalance?: (balance: bigint, decimals: number) => string;
}

export function TokenSelector({
  selectedToken,
  tokens,
  onTokenSelect,
  showBalance,
  mode,
  getBalance,
  formatBalance,
}: TokenSelectorProps) {
  const [showList, setShowList] = useState(false);

  // Determine balance label based on mode
  const balanceLabel = mode === 'shield' ? 'Public' : 'Shielded';

  return (
    <div>
      <label className="block text-sm text-void-muted mb-1.5">Token</label>
      <div className="relative">
        <button
          onClick={() => setShowList(!showList)}
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

        {showList && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowList(false)} />
            <div className="absolute top-full left-0 right-0 mt-2 bg-void-dark border border-void-border rounded-xl shadow-2xl overflow-hidden z-20 max-h-60 overflow-y-auto">
              {tokens.length === 0 ? (
                <div className="px-4 py-6 text-center text-void-muted text-sm">
                  {mode === 'unshield'
                    ? 'No tokens with balance available to unshield'
                    : 'No tokens available'}
                </div>
              ) : (
                tokens.map((token) => (
                  <button
                    key={token.address}
                    onClick={() => {
                      onTokenSelect(token);
                      setShowList(false);
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
                    {showBalance && getBalance && formatBalance && (
                      <div className="text-right">
                        <div className="text-xs text-void-muted">{balanceLabel}</div>
                        <div className="text-sm text-void-white">
                          {formatBalance(getBalance(token.address), token.decimals)}
                        </div>
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { HiExclamationTriangle } from 'react-icons/hi2';
import { Token } from '../TokenSelector';
import { getNetworkDisplayName } from '@/services/railgun';

interface ConfirmStepProps {
  mode: 'shield' | 'unshield';
  selectedNetwork: string | null;
  selectedToken: Token;
  amount: string;
  publicAddress: string;
  loading: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

export function ConfirmStep({
  mode,
  selectedNetwork,
  selectedToken,
  amount,
  publicAddress,
  loading,
  onConfirm,
  onBack,
}: ConfirmStepProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 bg-void-gray rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-void-muted">Action</span>
          <span className="text-sm text-void-white font-medium">
            {mode === 'shield' ? 'Shield' : 'Unshield'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-void-muted">Network</span>
          <span className="text-sm text-void-white">{getNetworkDisplayName(selectedNetwork) || 'Unknown'}</span>
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
        {mode === 'unshield' && publicAddress && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-void-muted">To</span>
            <span className="text-sm text-void-white font-mono">
              {publicAddress.slice(0, 8)}...{publicAddress.slice(-6)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3">
        <HiExclamationTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-200">
          Please confirm this transaction.{' '}
          {mode === 'shield'
            ? 'You will need to approve and sign two transactions in your wallet.'
            : 'A zero-knowledge proof will be generated which may take a few moments.'}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-xl font-semibold bg-void-gray text-void-white hover:bg-void-light transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
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
  );
}

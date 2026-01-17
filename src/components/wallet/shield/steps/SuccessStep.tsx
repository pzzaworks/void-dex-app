'use client';

import { useChainId } from 'wagmi';
import { HiCheckCircle, HiArrowTopRightOnSquare } from 'react-icons/hi2';

interface SuccessStepProps {
  mode: 'shield' | 'unshield';
  txHash: string | null;
  onClose: () => void;
}

// Get explorer URL for chain
function getExplorerUrl(chainId: number, txHash: string): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    11155111: 'https://sepolia.etherscan.io',
    137: 'https://polygonscan.com',
    42161: 'https://arbiscan.io',
    56: 'https://bscscan.com',
  };

  const baseUrl = explorers[chainId] || 'https://etherscan.io';
  return `${baseUrl}/tx/${txHash}`;
}

export function SuccessStep({ mode, txHash, onClose }: SuccessStepProps) {
  const chainId = useChainId();
  return (
    <div className="py-8 text-center">
      <HiCheckCircle className="w-16 h-16 mx-auto mb-4 text-void-success" />
      <h3 className="text-lg font-semibold text-void-white mb-2">
        {mode === 'shield' ? 'Tokens Shielded!' : 'Tokens Unshielded!'}
      </h3>
      <p className="text-sm text-void-muted mb-2">
        {mode === 'shield'
          ? 'Your tokens are now in your private balance.'
          : 'Your tokens have been sent to the destination address.'}
      </p>
      {mode === 'shield' && (
        <p className="text-xs text-yellow-400 mb-4 text-left">
          <span className="font-medium">Note:</span> Your shielded tokens will be available for
          unshielding after Proof of Innocence verification (~1 hour).
        </p>
      )}
      {txHash && (
        <div className="space-y-3 mb-4">
          <div className="p-3 bg-void-gray rounded-xl">
            <div className="text-xs text-void-muted mb-1">Transaction Hash</div>
            <div className="text-sm text-void-white font-mono break-all">{txHash}</div>
          </div>
          <a
            href={getExplorerUrl(chainId, txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-void-gray hover:bg-void-light text-void-white transition-colors text-sm"
          >
            <span>View on Explorer</span>
            <HiArrowTopRightOnSquare className="w-4 h-4" />
          </a>
        </div>
      )}
      <button
        onClick={onClose}
        className="w-full py-3 rounded-xl font-semibold bg-void-accent hover:bg-void-accent-hover text-void-black transition-colors"
      >
        Done
      </button>
    </div>
  );
}

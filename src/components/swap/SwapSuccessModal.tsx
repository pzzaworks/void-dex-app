'use client';

import { useEffect } from 'react';
import { HiCheckCircle, HiArrowTopRightOnSquare, HiDocumentDuplicate, HiXMark, HiArrowRight } from 'react-icons/hi2';
import { toast } from 'react-hot-toast';
import { formatAmount, formatTxHash } from '@/lib/format';

interface SwapSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  txHash: string;
  chainId: number;
  sellToken: { symbol: string; logo?: string };
  buyToken: { symbol: string; logo?: string };
  sellAmount: string;
  buyAmount: string;
}

// Get explorer URL for chain
function getExplorerUrl(chainId: number, txHash: string): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    10: 'https://optimistic.etherscan.io',
    56: 'https://bscscan.com',
    137: 'https://polygonscan.com',
    250: 'https://ftmscan.com',
    8453: 'https://basescan.org',
    42161: 'https://arbiscan.io',
    43114: 'https://snowtrace.io',
    11155111: 'https://sepolia.etherscan.io',
  };
  const base = explorers[chainId] || 'https://etherscan.io';
  return `${base}/tx/${txHash}`;
}

// Get explorer name for chain
function getExplorerName(chainId: number): string {
  const names: Record<number, string> = {
    1: 'Etherscan',
    10: 'Optimism Explorer',
    56: 'BscScan',
    137: 'PolygonScan',
    250: 'FTMScan',
    8453: 'BaseScan',
    42161: 'Arbiscan',
    43114: 'SnowTrace',
    11155111: 'Sepolia Etherscan',
  };
  return names[chainId] || 'Explorer';
}

export function SwapSuccessModal({
  isOpen,
  onClose,
  txHash,
  chainId,
  sellToken,
  buyToken,
  sellAmount,
  buyAmount,
}: SwapSuccessModalProps) {
  const explorerUrl = getExplorerUrl(chainId, txHash);
  const explorerName = getExplorerName(chainId);
  const shortTxHash = formatTxHash(txHash);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(txHash);
    toast.success('Transaction hash copied!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-void-dark border border-void-border rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-void-muted hover:text-void-text transition-colors rounded-lg hover:bg-void-gray"
        >
          <HiXMark className="w-5 h-5" />
        </button>

        {/* Success Icon */}
        <div className="flex justify-center mb-4">
          <HiCheckCircle className="w-14 h-14 text-void-success" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-void-white text-center mb-2">
          Swap Successful!
        </h2>
        <p className="text-sm text-void-muted text-center mb-6">
          Your private swap has been submitted to the network
        </p>

        {/* Swap Summary */}
        <div className="bg-void-gray rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            {/* Sell Side */}
            <div className="flex items-center gap-2">
              {sellToken.logo && (
                <img src={sellToken.logo} alt={sellToken.symbol} className="w-8 h-8 rounded-full" />
              )}
              <div>
                <div className="text-lg font-medium text-void-white">
                  {formatAmount(sellAmount, 6)}
                </div>
                <div className="text-sm text-void-muted">{sellToken.symbol}</div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex-shrink-0 px-3">
              <HiArrowRight className="w-6 h-6 text-void-accent" />
            </div>

            {/* Buy Side */}
            <div className="flex items-center gap-2">
              {buyToken.logo && (
                <img src={buyToken.logo} alt={buyToken.symbol} className="w-8 h-8 rounded-full" />
              )}
              <div className="text-right">
                <div className="text-lg font-medium text-void-success">
                  {formatAmount(buyAmount, 6)}
                </div>
                <div className="text-sm text-void-muted">{buyToken.symbol}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Hash */}
        <div className="bg-void-gray rounded-xl p-4 mb-6">
          <div className="text-sm text-void-muted mb-2">Transaction Hash</div>
          <div className="flex items-center justify-between gap-2">
            <code className="text-base text-void-text font-mono">{shortTxHash}</code>
            <button
              onClick={copyToClipboard}
              className="p-2 text-void-muted hover:text-void-accent transition-colors"
              title="Copy full hash"
            >
              <HiDocumentDuplicate className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 bg-void-accent hover:bg-void-accent-hover text-void-black rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <span>View on {explorerName}</span>
            <HiArrowTopRightOnSquare className="w-4 h-4" />
          </a>
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-void-gray hover:bg-void-light text-void-text rounded-xl font-medium transition-colors"
          >
            Close
          </button>
        </div>

        {/* Privacy Notice */}
        <p className="text-sm text-void-muted text-center mt-4">
          Note: Private transactions may take a few minutes to appear on the explorer
        </p>
      </div>
    </div>
  );
}

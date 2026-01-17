'use client';

import { HiXCircle } from 'react-icons/hi2';

interface ErrorStepProps {
  error: string | null;
  onRetry: () => void;
}

export function ErrorStep({ error, onRetry }: ErrorStepProps) {
  return (
    <div className="py-8 text-center">
      <HiXCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
      <h3 className="text-lg font-semibold text-void-white mb-2">Transaction Failed</h3>
      <p className="text-sm text-red-400 mb-4">{error || 'An unexpected error occurred.'}</p>
      <button
        onClick={onRetry}
        className="w-full py-3 rounded-xl font-semibold bg-void-gray text-void-white hover:bg-void-light transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

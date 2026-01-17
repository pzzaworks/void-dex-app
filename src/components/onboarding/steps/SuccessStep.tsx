'use client';

import { HiCheckCircle } from 'react-icons/hi2';

interface SuccessStepProps {
  onComplete: () => void;
}

export function SuccessStep({ onComplete }: SuccessStepProps) {
  return (
    <div className="text-center space-y-6">
      <HiCheckCircle className="w-16 h-16 mx-auto text-void-success" />

      <div>
        <h3 className="text-xl font-bold text-void-white mb-2">Wallet Created!</h3>
        <p className="text-void-muted">
          Your private wallet is ready. You can now shield tokens and make anonymous swaps.
        </p>
      </div>

      <div className="p-4 bg-void-gray rounded-xl">
        <div className="text-xs text-void-muted mb-2">Next Steps</div>
        <div className="space-y-2 text-sm text-left">
          <NextStepItem number={1} text="Shield some tokens to get started" />
          <NextStepItem number={2} text="Make private swaps with your shielded balance" />
          <NextStepItem number={3} text="Unshield when you need tokens publicly" />
        </div>
      </div>

      <button
        onClick={onComplete}
        className="w-full py-3.5 bg-void-accent hover:bg-void-accent-hover text-void-black font-semibold rounded-xl transition-colors"
      >
        Start Trading Privately
      </button>
    </div>
  );
}

function NextStepItem({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 h-5 flex items-center justify-center text-xs text-void-accent font-semibold">
        {number}.
      </span>
      <span className="text-void-text">{text}</span>
    </div>
  );
}

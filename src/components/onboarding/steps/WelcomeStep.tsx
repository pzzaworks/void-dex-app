'use client';

import { HiLockClosed, HiCheck } from 'react-icons/hi2';

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="text-center space-y-6">
      <HiLockClosed className="w-16 h-16 mx-auto text-void-accent" />

      <div>
        <h3 className="text-xl font-bold text-void-white mb-2">Welcome to Private Trading</h3>
        <p className="text-void-muted">
          Create your private wallet to make fully anonymous swaps using RAILGUN zero-knowledge
          proofs.
        </p>
      </div>

      <div className="space-y-3 text-left bg-void-gray/50 rounded-xl p-4">
        <FeatureItem
          title="100% Private Transactions"
          description="Your trades are completely hidden on-chain"
        />
        <FeatureItem title="Shielded Balances" description="Only you can see your token balances" />
        <FeatureItem title="Self-Custodial" description="You control your keys, always" />
      </div>

      <button
        onClick={onNext}
        className="w-full py-3.5 bg-void-accent hover:bg-void-accent-hover text-void-black font-semibold rounded-xl transition-colors"
      >
        Get Started
      </button>
    </div>
  );
}

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <HiCheck className="w-5 h-5 text-void-accent shrink-0 mt-0.5" />
      <div>
        <div className="text-sm font-medium text-void-white">{title}</div>
        <div className="text-xs text-void-muted">{description}</div>
      </div>
    </div>
  );
}

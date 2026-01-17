'use client';

import { HiInformationCircle } from 'react-icons/hi2';

interface InfoBoxProps {
  mode: 'shield' | 'unshield';
}

export function InfoBox({ mode }: InfoBoxProps) {
  return (
    <div className="p-4 bg-void-gray/50 rounded-xl">
      <div className="flex items-start gap-3">
        <HiInformationCircle className="w-5 h-5 text-void-accent shrink-0 mt-0.5" />
        <div className="text-sm text-void-muted">
          {mode === 'shield' ? (
            <>
              <strong className="text-void-white">How shielding works:</strong>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Approve RAILGUN contract to spend your tokens</li>
                <li>Tokens are moved to your private balance</li>
                <li>Your balance is protected by zero-knowledge proofs</li>
              </ol>
            </>
          ) : (
            <>
              <strong className="text-void-white">How unshielding works:</strong>
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>A ZK proof is generated to authorize withdrawal</li>
                <li>Tokens are sent to your destination address</li>
                <li>Transaction details remain private</li>
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

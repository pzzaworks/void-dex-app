'use client';

import { useState } from 'react';
import { HiExclamationTriangle } from 'react-icons/hi2';

interface VerifyBackupStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function VerifyBackupStep({ onNext, onBack }: VerifyBackupStepProps) {
  const [backupConfirmed, setBackupConfirmed] = useState(false);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-void-white mb-2">
          Are you sure you backed it up?
        </h3>
        <p className="text-sm text-void-muted">
          This is your last chance to go back and save your recovery phrase. Without it, you will
          lose access to your funds forever.
        </p>
      </div>

      <div className="flex items-start gap-3">
        <HiExclamationTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-200">
          <strong>Remember:</strong> If you clear your browser data or use a different device, you
          will need your recovery phrase to access your wallet.
        </div>
      </div>

      <label className="flex items-start gap-3 p-4 bg-void-gray rounded-xl cursor-pointer group">
        <input
          type="checkbox"
          checked={backupConfirmed}
          onChange={(e) => setBackupConfirmed(e.target.checked)}
          className="w-5 h-5 mt-0.5 rounded border-void-border bg-void-light text-void-accent focus:ring-void-accent focus:ring-offset-0"
        />
        <span className="text-sm text-void-text group-hover:text-void-white transition-colors">
          I understand that I am responsible for my recovery phrase and that VoidDEX cannot help me
          recover it if lost.
        </span>
      </label>

      <button
        onClick={onNext}
        disabled={!backupConfirmed}
        className={`w-full py-3.5 rounded-xl font-semibold transition-all ${
          backupConfirmed
            ? 'bg-void-accent hover:bg-void-accent-hover text-void-black'
            : 'bg-void-gray text-void-muted cursor-not-allowed'
        }`}
      >
        Continue to Verification
      </button>

      <button
        onClick={onBack}
        className="w-full py-3 px-4 bg-void-gray hover:bg-void-light text-void-text rounded-xl font-medium transition-colors"
      >
        Back
      </button>
    </div>
  );
}

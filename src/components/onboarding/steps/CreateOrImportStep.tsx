'use client';

import { HiPlus, HiArrowUpTray } from 'react-icons/hi2';

interface CreateOrImportStepProps {
  onCreateNew: () => void;
  onImportExisting: () => void;
  onBack: () => void;
}

export function CreateOrImportStep({
  onCreateNew,
  onImportExisting,
  onBack,
}: CreateOrImportStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-void-muted text-center mb-6">
        Choose how you want to set up your private wallet.
      </p>

      <button
        onClick={onCreateNew}
        className="w-full flex items-center gap-4 p-4 bg-void-gray hover:bg-void-light rounded-xl transition-colors group border border-transparent hover:border-void-accent/30"
      >
        <HiPlus className="w-8 h-8 text-void-accent" />
        <div className="text-left">
          <div className="font-medium text-void-white group-hover:text-void-accent transition-colors">
            Create New Wallet
          </div>
          <div className="text-sm text-void-muted">Generate a new 12-word recovery phrase</div>
        </div>
      </button>

      <button
        onClick={onImportExisting}
        className="w-full flex items-center gap-4 p-4 bg-void-gray hover:bg-void-light rounded-xl transition-colors group border border-transparent hover:border-void-light"
      >
        <HiArrowUpTray className="w-8 h-8 text-purple-400" />
        <div className="text-left">
          <div className="font-medium text-void-white group-hover:text-purple-400 transition-colors">
            Import Existing Wallet
          </div>
          <div className="text-sm text-void-muted">Use your existing recovery phrase</div>
        </div>
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

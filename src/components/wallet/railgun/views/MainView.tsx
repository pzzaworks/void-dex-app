'use client';

import { HiPlus, HiArrowUpTray } from 'react-icons/hi2';

interface MainViewProps {
  onCreateNew: () => void;
  onImportExisting: () => void;
}

export function MainView({ onCreateNew, onImportExisting }: MainViewProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-void-muted text-center mb-6">
        Create a private wallet to shield your tokens and make fully anonymous swaps using RAILGUN.
      </p>

      <button
        onClick={onCreateNew}
        className="w-full flex items-center gap-4 p-4 bg-void-gray hover:bg-void-light rounded-xl transition-colors group"
      >
        <HiPlus className="w-8 h-8 text-void-accent" />
        <div className="text-left">
          <div className="font-medium text-void-white group-hover:text-void-accent transition-colors">
            Create New Wallet
          </div>
          <div className="text-sm text-void-muted">Generate a new recovery phrase</div>
        </div>
      </button>

      <button
        onClick={onImportExisting}
        className="w-full flex items-center gap-4 p-4 bg-void-gray hover:bg-void-light rounded-xl transition-colors group"
      >
        <HiArrowUpTray className="w-8 h-8 text-purple-400" />
        <div className="text-left">
          <div className="font-medium text-void-white group-hover:text-purple-400 transition-colors">
            Import Existing Wallet
          </div>
          <div className="text-sm text-void-muted">Use your recovery phrase</div>
        </div>
      </button>
    </div>
  );
}

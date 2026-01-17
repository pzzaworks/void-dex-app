'use client';

import { useState } from 'react';
import { HiExclamationTriangle, HiEye, HiCheck, HiClipboardDocument } from 'react-icons/hi2';

interface CreateViewProps {
  mnemonic: string;
  onCopyMnemonic: () => void;
  mnemonicCopied: boolean;
  onNext: () => void;
}

export function CreateView({ mnemonic, onCopyMnemonic, mnemonicCopied, onNext }: CreateViewProps) {
  const [showMnemonic, setShowMnemonic] = useState(false);
  const mnemonicWords = mnemonic.split(' ');

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <HiExclamationTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-200">
          <strong>Write this down!</strong> This is your only way to recover your wallet. Store it
          safely offline.
        </div>
      </div>

      <div className="relative">
        <div
          className={`grid grid-cols-3 gap-2 p-4 bg-void-gray rounded-xl ${
            !showMnemonic ? 'blur-sm select-none' : ''
          }`}
        >
          {mnemonicWords.map((word, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5 bg-void-light rounded-lg">
              <span className="text-xs text-void-muted w-4">{i + 1}.</span>
              <span className="text-sm text-void-white font-mono">{word}</span>
            </div>
          ))}
        </div>

        {!showMnemonic && (
          <button
            onClick={() => setShowMnemonic(true)}
            className="absolute inset-0 flex items-center justify-center bg-void-gray/50 rounded-xl"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-void-light rounded-lg text-void-white">
              <HiEye className="w-5 h-5" />
              <span>Click to reveal</span>
            </div>
          </button>
        )}
      </div>

      <button
        onClick={onCopyMnemonic}
        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-void-muted hover:text-void-white transition-colors"
      >
        {mnemonicCopied ? (
          <>
            <HiCheck className="w-4 h-4 text-void-success" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <HiClipboardDocument className="w-4 h-4" />
            <span>Copy to clipboard</span>
          </>
        )}
      </button>

      <button
        onClick={onNext}
        disabled={!showMnemonic}
        className={`w-full py-3 rounded-xl font-semibold transition-all ${
          showMnemonic
            ? 'bg-void-accent hover:bg-void-accent-hover text-void-black'
            : 'bg-void-gray text-void-muted cursor-not-allowed'
        }`}
      >
        I have saved my recovery phrase
      </button>
    </div>
  );
}

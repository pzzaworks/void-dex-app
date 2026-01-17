'use client';

import { useState, useCallback } from 'react';

interface ShowMnemonicStepProps {
  mnemonic: string;
  onNext: () => void;
  onBack: () => void;
}

export function ShowMnemonicStep({ mnemonic, onNext, onBack }: ShowMnemonicStepProps) {
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [mnemonicCopied, setMnemonicCopied] = useState(false);

  const mnemonicWords = mnemonic.split(' ').filter(Boolean);

  const handleCopyMnemonic = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setMnemonicCopied(true);
      setTimeout(() => setMnemonicCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [mnemonic]);

  return (
    <div className="space-y-4">
      {/* Critical Warning */}
      <div className="flex items-start gap-3">
        <svg
          className="w-8 h-8 text-red-500 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div>
          <div className="font-semibold text-red-400 mb-1">
            Critical: Back Up Your Recovery Phrase
          </div>
          <ul className="text-sm text-red-300/80 space-y-1">
            <li>This is the ONLY way to recover your wallet</li>
            <li>If you lose it, your funds are GONE FOREVER</li>
            <li>Never share it with anyone</li>
            <li>Store it safely offline (write it down on paper)</li>
          </ul>
        </div>
      </div>

      {/* Mnemonic Display */}
      <div className="relative">
        <div
          className={`grid grid-cols-3 gap-2 p-4 bg-void-gray rounded-xl ${
            !showMnemonic ? 'blur-md select-none pointer-events-none' : ''
          }`}
        >
          {mnemonicWords.length > 0
            ? mnemonicWords.map((word, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1.5 bg-void-light rounded-lg"
                >
                  <span className="text-xs text-void-muted w-5">{i + 1}.</span>
                  <span className="text-sm text-void-white font-mono">{word}</span>
                </div>
              ))
            : Array(12)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2 py-1.5 bg-void-light rounded-lg animate-pulse"
                  >
                    <span className="text-xs text-void-muted w-5">{i + 1}.</span>
                    <span className="text-sm text-void-muted">loading...</span>
                  </div>
                ))}
        </div>

        {!showMnemonic && (
          <button
            onClick={() => setShowMnemonic(true)}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 bg-void-light/90 rounded-lg text-void-white shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span className="font-medium">Click to reveal</span>
            </div>
          </button>
        )}
      </div>

      {/* Copy Button */}
      {showMnemonic && (
        <button
          onClick={handleCopyMnemonic}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-void-muted hover:text-void-white transition-colors"
        >
          {mnemonicCopied ? (
            <>
              <svg
                className="w-4 h-4 text-void-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Copied to clipboard!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>Copy to clipboard</span>
            </>
          )}
        </button>
      )}

      <button
        onClick={onNext}
        disabled={!showMnemonic || !mnemonic}
        className={`w-full py-3.5 rounded-xl font-semibold transition-all ${
          showMnemonic && mnemonic
            ? 'bg-void-accent hover:bg-void-accent-hover text-void-black'
            : 'bg-void-gray text-void-muted cursor-not-allowed'
        }`}
      >
        I have written down my recovery phrase
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

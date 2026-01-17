'use client';

interface ImportMnemonicStepProps {
  importMnemonic: string;
  onMnemonicChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
  error: string | null;
}

export function ImportMnemonicStep({
  importMnemonic,
  onMnemonicChange,
  onNext,
  onBack,
  error,
}: ImportMnemonicStepProps) {
  const isValid = importMnemonic.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-void-white mb-2">Import Your Wallet</h3>
        <p className="text-sm text-void-muted">
          Enter your 12 or 24 word recovery phrase to import your existing RAILGUN wallet.
        </p>
      </div>

      <div>
        <label className="block text-sm text-void-muted mb-1.5">Recovery Phrase</label>
        <textarea
          value={importMnemonic}
          onChange={(e) => onMnemonicChange(e.target.value)}
          placeholder="Enter your recovery phrase, words separated by spaces"
          rows={4}
          className="w-full px-4 py-3 bg-void-gray rounded-xl text-void-white placeholder:text-void-muted focus:outline-none focus:ring-1 focus:ring-void-accent resize-none font-mono text-sm"
        />
      </div>

      {error && <div className="text-sm text-red-400">{error}</div>}

      <button
        onClick={onNext}
        disabled={!isValid}
        className={`w-full py-3.5 rounded-xl font-semibold transition-all ${
          isValid
            ? 'bg-void-accent hover:bg-void-accent-hover text-void-black'
            : 'bg-void-gray text-void-muted cursor-not-allowed'
        }`}
      >
        Continue
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

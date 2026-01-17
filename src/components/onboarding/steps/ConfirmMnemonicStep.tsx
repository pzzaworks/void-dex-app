'use client';

interface ConfirmMnemonicStepProps {
  verifyWords: { index: number; word: string }[];
  verifyInputs: string[];
  onInputChange: (index: number, value: string) => void;
  onNext: () => void;
  onBack: () => void;
  error: string | null;
}

export function ConfirmMnemonicStep({
  verifyWords,
  verifyInputs,
  onInputChange,
  onNext,
  onBack,
  error,
}: ConfirmMnemonicStepProps) {
  const isValid = verifyInputs.every((v) => v.trim());

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-void-white mb-2">Verify Your Backup</h3>
        <p className="text-sm text-void-muted">
          Enter the following words from your recovery phrase to confirm you saved it correctly.
        </p>
      </div>

      <div className="space-y-3">
        {verifyWords.map((vw, i) => (
          <div key={vw.index}>
            <label className="block text-sm text-void-muted mb-1.5">Word #{vw.index + 1}</label>
            <input
              type="text"
              value={verifyInputs[i]}
              onChange={(e) => onInputChange(i, e.target.value)}
              placeholder={`Enter word #${vw.index + 1}`}
              className="w-full px-4 py-3 bg-void-gray rounded-xl text-void-white placeholder:text-void-muted focus:outline-none focus:ring-1 focus:ring-void-accent font-mono"
              autoComplete="off"
            />
          </div>
        ))}
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
        Verify & Continue
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

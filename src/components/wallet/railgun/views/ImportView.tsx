'use client';

import { PasswordInput } from '../components/PasswordInput';

interface ImportViewProps {
  mnemonic: string;
  onMnemonicChange: (value: string) => void;
  password: string;
  passwordConfirm: string;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}

export function ImportView({
  mnemonic,
  onMnemonicChange,
  password,
  passwordConfirm,
  onPasswordChange,
  onPasswordConfirmChange,
  onSubmit,
  loading,
  error,
}: ImportViewProps) {
  const isValid = mnemonic.trim().length > 0 && password.length > 0 && passwordConfirm.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-void-muted mb-1.5">Recovery Phrase</label>
        <textarea
          value={mnemonic}
          onChange={(e) => onMnemonicChange(e.target.value)}
          placeholder="Enter your 12 or 24 word recovery phrase"
          rows={3}
          className="w-full px-4 py-3 bg-void-gray rounded-xl text-void-white placeholder:text-void-muted focus:outline-none focus:ring-1 focus:ring-void-accent resize-none font-mono text-sm"
        />
      </div>

      <PasswordInput
        password={password}
        passwordConfirm={passwordConfirm}
        onPasswordChange={onPasswordChange}
        onPasswordConfirmChange={onPasswordConfirmChange}
      />

      {error && <div className="text-sm text-red-400">{error}</div>}

      <button
        onClick={onSubmit}
        disabled={loading || !isValid}
        className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
          loading || !isValid
            ? 'bg-void-gray text-void-muted cursor-not-allowed'
            : 'bg-void-accent hover:bg-void-accent-hover text-void-black'
        }`}
      >
        {loading && (
          <div className="w-4 h-4 border-2 border-void-muted border-t-void-black rounded-full animate-spin" />
        )}
        {loading ? 'Importing Wallet...' : 'Import Wallet'}
      </button>
    </div>
  );
}

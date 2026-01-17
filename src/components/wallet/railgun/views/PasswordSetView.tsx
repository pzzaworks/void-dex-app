'use client';

import { PasswordInput } from '../components/PasswordInput';

interface PasswordSetViewProps {
  password: string;
  passwordConfirm: string;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}

export function PasswordSetView({
  password,
  passwordConfirm,
  onPasswordChange,
  onPasswordConfirmChange,
  onSubmit,
  loading,
  error,
}: PasswordSetViewProps) {
  const isValid = password.length > 0 && passwordConfirm.length > 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-void-muted">
        Set a strong password to encrypt your wallet. You will need this password to unlock your
        wallet.
      </p>

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
        {loading ? 'Creating Wallet...' : 'Create Wallet'}
      </button>
    </div>
  );
}

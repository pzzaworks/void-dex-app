'use client';

import { useState } from 'react';
import { HiEye, HiEyeSlash } from 'react-icons/hi2';

interface SetPasswordStepProps {
  password: string;
  passwordConfirm: string;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
  error: string | null;
}

export function SetPasswordStep({
  password,
  passwordConfirm,
  onPasswordChange,
  onPasswordConfirmChange,
  onNext,
  onBack,
  error,
}: SetPasswordStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isValid = password.length > 0 && passwordConfirm.length > 0;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-void-white mb-2">Secure Your Wallet</h3>
        <p className="text-sm text-void-muted">
          Set a strong password to encrypt your wallet. You&apos;ll need this to unlock your wallet
          each session.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm text-void-muted mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Enter a strong password"
              className="w-full px-4 py-3 bg-void-gray rounded-xl text-void-white placeholder:text-void-muted focus:outline-none focus:ring-1 focus:ring-void-accent pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-void-muted hover:text-void-white transition-colors"
            >
              {showPassword ? <HiEyeSlash className="w-5 h-5" /> : <HiEye className="w-5 h-5" />}
            </button>
          </div>
          <PasswordStrengthIndicator password={password} />
        </div>

        <div>
          <label className="block text-sm text-void-muted mb-1.5">Confirm Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={passwordConfirm}
            onChange={(e) => onPasswordConfirmChange(e.target.value)}
            placeholder="Confirm your password"
            className="w-full px-4 py-3 bg-void-gray rounded-xl text-void-white placeholder:text-void-muted focus:outline-none focus:ring-1 focus:ring-void-accent"
          />
        </div>
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
        Create Wallet
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

function PasswordStrengthIndicator({ password }: { password: string }) {
  return (
    <div className="mt-1.5 flex gap-1">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full ${
            password.length >= i * 4
              ? password.length >= 12
                ? 'bg-void-success'
                : password.length >= 8
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              : 'bg-void-gray'
          }`}
        />
      ))}
    </div>
  );
}

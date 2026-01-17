'use client';

import { useState } from 'react';
import { HiEye, HiEyeSlash } from 'react-icons/hi2';

interface PasswordInputProps {
  password: string;
  passwordConfirm: string;
  onPasswordChange: (value: string) => void;
  onPasswordConfirmChange: (value: string) => void;
  showConfirm?: boolean;
}

export function PasswordInput({
  password,
  passwordConfirm,
  onPasswordChange,
  onPasswordConfirmChange,
  showConfirm = true,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm text-void-muted mb-1.5">Password</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Enter password"
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
      </div>

      {showConfirm && (
        <div>
          <label className="block text-sm text-void-muted mb-1.5">Confirm Password</label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={passwordConfirm}
            onChange={(e) => onPasswordConfirmChange(e.target.value)}
            placeholder="Confirm password"
            className="w-full px-4 py-3 bg-void-gray rounded-xl text-void-white placeholder:text-void-muted focus:outline-none focus:ring-1 focus:ring-void-accent"
          />
        </div>
      )}
    </div>
  );
}

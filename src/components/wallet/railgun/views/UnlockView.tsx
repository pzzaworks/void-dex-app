'use client';

import { useState } from 'react';
import { HiLockClosed, HiEye, HiEyeSlash } from 'react-icons/hi2';

interface UnlockViewProps {
  railgunAddress: string | null;
  password: string;
  onPasswordChange: (value: string) => void;
  onUnlock: () => void;
  onDelete: () => void;
  loading: boolean;
  error: string | null;
  passwordInputRef?: (el: HTMLInputElement | null) => void;
}

export function UnlockView({
  railgunAddress,
  password,
  onPasswordChange,
  onUnlock,
  onDelete,
  loading,
  error,
  passwordInputRef,
}: UnlockViewProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center mb-4 py-8">
        <HiLockClosed className="w-12 h-12 text-void-accent" />
      </div>

      {railgunAddress && (
        <div className="p-3 bg-void-gray rounded-xl">
          <div className="text-xs text-void-muted mb-1">Wallet Address</div>
          <div className="text-sm text-void-white font-mono break-all">
            {railgunAddress.slice(0, 20)}...{railgunAddress.slice(-8)}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm text-void-muted mb-1.5">Password</label>
        <div className="relative">
          <input
            ref={passwordInputRef}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && onUnlock()}
            placeholder="Enter your password"
            autoFocus
            disabled={loading}
            className="w-full px-4 py-3 bg-void-gray rounded-xl text-void-white placeholder:text-void-muted focus:outline-none focus:ring-1 focus:ring-void-accent pr-12 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {error && <div className="text-sm text-red-400">{error}</div>}

      <button
        onClick={onUnlock}
        disabled={loading || !password}
        className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
          loading || !password
            ? 'bg-void-gray text-void-muted cursor-not-allowed'
            : 'bg-void-accent hover:bg-void-accent-hover text-void-black'
        }`}
      >
        {loading && (
          <div className="w-4 h-4 border-2 border-void-muted border-t-void-black rounded-full animate-spin" />
        )}
        {loading ? 'Unlocking...' : 'Unlock Wallet'}
      </button>

      <p className="text-sm text-void-muted text-center px-2 py-2">
        By unlocking your wallet, you agree to our{' '}
        <a href="/terms" className="text-void-accent hover:underline">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="text-void-accent hover:underline">
          Privacy Policy
        </a>
        .
      </p>

      <div className="pt-3 mt-2 border-t border-void-border">
        <button
          onClick={onDelete}
          className="w-full py-2 text-sm text-void-muted hover:text-red-400 transition-colors"
        >
          Delete wallet and start over
        </button>
      </div>
    </div>
  );
}

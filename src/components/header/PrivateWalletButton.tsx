'use client';

import { useState, useRef, useEffect } from 'react';
import {
  HiLockClosed,
  HiChevronDown,
  HiCheckCircle,
  HiClipboard,
  HiLockOpen,
} from 'react-icons/hi2';
import { useRailgun } from '@/providers/RailgunProvider';
import { useRailgunPrivateWalletUI } from '@/providers/RailgunPrivateWalletUIProvider';
import { formatAddress } from '@/lib/format';

export function PrivateWalletButton() {
  const { isReady, hasWallet, railgunAddress, lockWallet } = useRailgun();
  const { openOnboarding, openUnlock, openShield, openUnshield } = useRailgunPrivateWalletUI();
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle button click based on wallet state
  const handleClick = () => {
    if (isReady) {
      // Wallet unlocked - show dropdown
      setShowDropdown(!showDropdown);
    } else if (hasWallet) {
      // Wallet exists but locked - show unlock
      openUnlock();
    } else {
      // No wallet - show onboarding
      openOnboarding();
    }
  };

  const handleCopy = async () => {
    if (railgunAddress) {
      await navigator.clipboard.writeText(railgunAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // If no wallet exists, show create button
  if (!hasWallet) {
    return (
      <button
        onClick={openOnboarding}
        className="h-10 flex items-center gap-2 px-3 bg-void-gray hover:bg-void-light border border-void-border rounded-xl transition-colors"
      >
        <HiLockClosed className="w-5 h-5 text-void-accent" />
        <span className="text-sm font-medium text-void-text">Create Private Wallet</span>
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleClick}
        className="h-10 flex items-center gap-2 px-3 bg-void-gray hover:bg-void-light border border-void-border rounded-xl transition-colors"
      >
        <HiLockClosed className="w-5 h-5 text-void-accent" />
        <span className="text-sm font-mono text-void-text">
          {isReady ? formatAddress(railgunAddress || '') : 'Unlock Wallet'}
        </span>
        <HiChevronDown
          className={`w-4 h-4 text-void-muted transition-transform ${showDropdown ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-void-dark border border-void-border rounded-xl shadow-2xl overflow-hidden z-50">
          {/* Address Display */}
          <div className="p-4 border-b border-void-border">
            <div className="flex items-center gap-3">
              <HiLockClosed className="w-6 h-6 text-void-accent" />
              <div>
                <div className="font-mono text-sm text-void-white">
                  {formatAddress(railgunAddress || '')}
                </div>
                <div className="text-sm text-void-muted">Private Wallet</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-1">
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-void-gray transition-colors text-void-text"
            >
              {copied ? (
                <HiCheckCircle className="w-5 h-5 text-void-success" />
              ) : (
                <HiClipboard className="w-5 h-5" />
              )}
              <span>{copied ? 'Copied!' : 'Copy Address'}</span>
            </button>

            <button
              onClick={() => {
                setShowDropdown(false);
                openShield();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-void-gray transition-colors text-void-text"
            >
              <HiLockClosed className="w-5 h-5" />
              <span>Shield Tokens</span>
            </button>

            <button
              onClick={() => {
                setShowDropdown(false);
                openUnshield();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-void-gray transition-colors text-void-text"
            >
              <HiLockOpen className="w-5 h-5" />
              <span>Unshield Tokens</span>
            </button>

            <button
              onClick={async () => {
                await lockWallet();
                setShowDropdown(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-void-gray transition-colors text-void-danger"
            >
              <HiLockClosed className="w-5 h-5" />
              <span>Lock Wallet</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

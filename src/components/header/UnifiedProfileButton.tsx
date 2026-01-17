'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useRailgun } from '@/providers/RailgunProvider';
import { useRailgunPrivateWalletUI } from '@/providers/RailgunPrivateWalletUIProvider';
import {
  HiWallet,
  HiLockClosed,
  HiLockOpen,
  HiChevronDown,
  HiClipboardDocument,
  HiCheck,
  HiArrowRightOnRectangle,
  HiPaperAirplane,
  HiArrowLeft,
  HiShieldCheck,
  HiPlus,
} from 'react-icons/hi2';
import { formatAddress } from '@/lib/format';

interface UnifiedProfileButtonProps {
  disabled?: boolean;
}

export function UnifiedProfileButton({ disabled = false }: UnifiedProfileButtonProps) {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { isReady, hasWallet, railgunAddress, lockWallet, providerStatus } = useRailgun();
  const isSyncing = providerStatus === 'loading';
  const { openOnboarding, openUnlock, openTransfer, openShield, openUnshield, openReceive } =
    useRailgunPrivateWalletUI();

  const [showDropdown, setShowDropdown] = useState(false);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedPrivate, setCopiedPrivate] = useState(false);
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

  const handleCopyPublic = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopiedPublic(true);
      setTimeout(() => setCopiedPublic(false), 2000);
    }
  };

  const handleCopyPrivate = async () => {
    if (railgunAddress) {
      await navigator.clipboard.writeText(railgunAddress);
      setCopiedPrivate(true);
      setTimeout(() => setCopiedPrivate(false), 2000);
    }
  };

  const handlePrivateAction = (action: () => void) => {
    setShowDropdown(false);
    action();
  };

  if (!address) return null;

  return (
    <div ref={ref} className="relative">
      {/* Dual Wallet Button */}
      <button
        onClick={() => !disabled && setShowDropdown(!showDropdown)}
        disabled={disabled}
        className={`h-10 flex items-center gap-2 px-3 border border-void-border rounded-xl transition-colors ${
          disabled
            ? 'bg-void-gray text-void-muted cursor-not-allowed opacity-60'
            : 'bg-void-gray hover:bg-void-light'
        }`}
      >
        {/* Public Wallet */}
        <div className="flex items-center gap-1.5">
          <HiWallet className="w-4 h-4 text-green-400" />
          <span className="text-sm text-void-text">{formatAddress(address)}</span>
        </div>

        {/* Separator */}
        <div className="w-px h-3 bg-void-border" />

        {/* Private Wallet */}
        <div className="flex items-center gap-1.5">
          {isReady ? (
            <HiLockOpen className="w-4 h-4 text-void-accent" />
          ) : (
            <HiLockClosed className="w-4 h-4 text-void-muted" />
          )}
          <span className="text-sm text-void-text">
            {isReady ? formatAddress(railgunAddress ?? undefined) : hasWallet ? 'Locked' : 'Create'}
          </span>
        </div>

        {/* Dropdown Icon */}
        <HiChevronDown
          className={`w-4 h-4 text-void-muted transition-transform ${showDropdown ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Unified Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-void-dark border border-void-border rounded-xl shadow-2xl overflow-hidden z-50">
          {/* PUBLIC WALLET SECTION */}
          <div className="p-3 border-b border-void-border">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-void-muted">Public Wallet</div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                <span className="text-xs text-void-muted">Connected</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-1 flex-1 min-w-0">
                <HiWallet className="w-5 h-5 text-green-400 shrink-0" />
                <div className="text-sm text-void-white truncate">{formatAddress(address)}</div>
              </div>
              <button
                onClick={handleCopyPublic}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-void-gray transition-colors text-void-muted hover:text-void-text text-xs"
              >
                {copiedPublic ? (
                  <HiCheck className="w-3.5 h-3.5 text-void-success" />
                ) : (
                  <HiClipboardDocument className="w-3.5 h-3.5" />
                )}
                <span>{copiedPublic ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="h-px bg-void-border my-2" />

            <div className="space-y-0.5">
              <button
                onClick={() => disconnect()}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-void-gray transition-colors text-void-danger"
              >
                <HiArrowRightOnRectangle className="w-4 h-4" />
                <span className="font-medium">Disconnect</span>
              </button>
            </div>
          </div>

          {/* PRIVATE WALLET SECTION */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-void-muted">Private Wallet</div>
              {isReady && (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  <span className="text-xs text-void-muted">Unlocked</span>
                </div>
              )}
            </div>

            {!hasWallet ? (
              // No wallet - Create
              <button
                onClick={() => handlePrivateAction(openOnboarding)}
                className="w-full flex items-center gap-2 p-2.5 bg-void-accent/10 hover:bg-void-accent/20 border border-void-accent/30 rounded-lg transition-colors"
              >
                <HiPlus className="w-5 h-5 text-void-accent shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-medium text-void-white">Create Private Wallet</div>
                  <div className="text-xs text-void-muted">Powered by Railgun</div>
                </div>
              </button>
            ) : !isReady ? (
              // Wallet exists but locked - Unlock
              <button
                onClick={() => handlePrivateAction(openUnlock)}
                className="w-full flex items-center gap-2 p-2.5 bg-void-gray hover:bg-void-light border border-void-border rounded-lg transition-colors"
              >
                <HiLockClosed className="w-5 h-5 text-void-accent shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-medium text-void-white">Unlock Private Wallet</div>
                  <div className="text-xs text-void-muted">Enter password to unlock</div>
                </div>
              </button>
            ) : (
              // Wallet unlocked - Actions
              <>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-1 flex-1 min-w-0">
                    <HiLockClosed className="w-5 h-5 text-void-accent shrink-0" />
                    <div className="text-sm text-void-white truncate">
                      {formatAddress(railgunAddress ?? undefined)}
                    </div>
                  </div>
                  <button
                    onClick={handleCopyPrivate}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-void-gray transition-colors text-void-muted hover:text-void-text text-xs"
                  >
                    {copiedPrivate ? (
                      <HiCheck className="w-3.5 h-3.5 text-void-success" />
                    ) : (
                      <HiClipboardDocument className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedPrivate ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                {/* Syncing Banner */}
                {isSyncing && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-void-accent/10 rounded-lg text-void-accent text-xs">
                    <div className="w-3 h-3 border-2 border-void-accent border-t-transparent rounded-full animate-spin" />
                    <span>Syncing balances...</span>
                  </div>
                )}

                <div className="h-px bg-void-border my-2" />

                <div className={`space-y-0.5 ${isSyncing ? 'opacity-50 pointer-events-none' : ''}`}>
                  <button
                    onClick={() => handlePrivateAction(openTransfer)}
                    disabled={isSyncing}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-void-gray transition-colors text-void-text disabled:cursor-not-allowed"
                  >
                    <HiPaperAirplane className="w-4 h-4" />
                    <span className="font-medium">Send Privately</span>
                  </button>

                  <button
                    onClick={() => handlePrivateAction(openReceive)}
                    disabled={isSyncing}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-void-gray transition-colors text-void-text disabled:cursor-not-allowed"
                  >
                    <HiArrowLeft className="w-4 h-4" />
                    <span className="font-medium">Receive Privately</span>
                  </button>

                  <button
                    onClick={() => handlePrivateAction(openShield)}
                    disabled={isSyncing}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-void-gray transition-colors text-void-text disabled:cursor-not-allowed"
                  >
                    <HiShieldCheck className="w-4 h-4" />
                    <span className="font-medium">Shield Tokens</span>
                  </button>

                  <button
                    onClick={() => handlePrivateAction(openUnshield)}
                    disabled={isSyncing}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-void-gray transition-colors text-void-text disabled:cursor-not-allowed"
                  >
                    <HiLockOpen className="w-4 h-4" />
                    <span className="font-medium">Unshield Tokens</span>
                  </button>

                  <button
                    onClick={async () => {
                      await lockWallet();
                      setShowDropdown(false);
                    }}
                    disabled={isSyncing}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-void-gray transition-colors text-void-danger disabled:cursor-not-allowed"
                  >
                    <HiLockClosed className="w-4 h-4" />
                    <span className="font-medium">Lock</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

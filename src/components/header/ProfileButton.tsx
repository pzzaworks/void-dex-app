'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import {
  HiChevronDown,
  HiCheck,
  HiClipboardDocument,
  HiArrowRightOnRectangle,
} from 'react-icons/hi2';

interface ProfileButtonProps {
  disabled?: boolean;
}

export function ProfileButton({ disabled = false }: ProfileButtonProps) {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isConnected) {
    return (
      <button
        onClick={openConnectModal}
        disabled={disabled}
        className={`h-10 px-4 font-semibold rounded-xl transition-colors ${
          disabled
            ? 'bg-void-gray text-void-muted cursor-not-allowed opacity-60'
            : 'bg-void-accent hover:bg-void-accent-hover text-void-black'
        }`}
      >
        Connect
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 flex items-center gap-2 px-3 bg-void-gray hover:bg-void-light border border-void-border rounded-xl transition-colors"
      >
        <Image src="/void-dex-logo.svg" alt="" width={20} height={20} className="invert" />
        <span className="text-sm font-mono text-void-text">{shortenAddress(address!)}</span>
        <HiChevronDown
          className={`w-4 h-4 text-void-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-void-dark border border-void-border rounded-xl shadow-2xl overflow-hidden z-50">
          {/* Address Display */}
          <div className="p-4 border-b border-void-border">
            <div className="flex items-center gap-3">
              <Image src="/void-dex-logo.svg" alt="" width={32} height={32} className="invert" />
              <div>
                <div className="font-mono text-sm text-void-white">{shortenAddress(address!)}</div>
                <div className="text-sm text-void-muted">Connected</div>
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
                <HiCheck className="w-5 h-5 text-void-success" />
              ) : (
                <HiClipboardDocument className="w-5 h-5" />
              )}
              <span>{copied ? 'Copied!' : 'Copy Address'}</span>
            </button>

            <button
              onClick={() => {
                disconnect();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-void-gray transition-colors text-void-danger"
            >
              <HiArrowRightOnRectangle className="w-5 h-5" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useChainId, useSwitchChain } from 'wagmi';
import { mainnet, polygon, arbitrum, bsc, sepolia } from 'wagmi/chains';
import Image from 'next/image';
import { HiChevronDown, HiCheckCircle } from 'react-icons/hi2';
import { useEnabledNetworks } from '@/hooks/useSettings';

// All supported chains with their icons
const ALL_CHAINS = [
  { ...mainnet, icon: '/networks/ethereum.svg' },
  { ...polygon, icon: '/networks/polygon.svg' },
  { ...arbitrum, icon: '/networks/arbitrum.svg' },
  { ...bsc, icon: '/networks/bsc.svg' },
  { ...sepolia, icon: '/networks/ethereum.svg' },
];

// Chain ID to chain config mapping
const CHAIN_MAP = Object.fromEntries(ALL_CHAINS.map((c) => [c.id, c]));

interface NetworkSelectorProps {
  onSelect?: () => void;
}

export function NetworkSelector({ onSelect }: NetworkSelectorProps = {}) {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { networks: enabledNetworks } = useEnabledNetworks();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Filter chains based on API-enabled networks
  const CHAINS = useMemo(() => {
    if (enabledNetworks.length === 0) {
      // Default to Sepolia if API hasn't loaded yet
      return [ALL_CHAINS.find((c) => c.id === sepolia.id)!];
    }
    return enabledNetworks
      .map((n) => CHAIN_MAP[n.chainId])
      .filter(Boolean);
  }, [enabledNetworks]);

  const currentChain = CHAINS.find((c) => c.id === chainId) || CHAINS[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if chain is a testnet
  const isTestnet = (chain: (typeof CHAINS)[0]) => {
    return chain.id === sepolia.id || chain.testnet === true;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <div className="h-10 w-40 bg-void-gray border border-void-border rounded-xl animate-pulse" />
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 flex items-center gap-1.5 px-3 bg-void-gray hover:bg-void-light border border-void-border rounded-xl transition-colors"
      >
        <Image
          src={currentChain.icon}
          alt={currentChain.name}
          width={20}
          height={20}
          className="rounded-full"
        />
        <span className="text-sm text-void-text">{currentChain.name}</span>
        {isTestnet(currentChain) && (
          <span className="text-xs text-void-muted bg-void-light px-1.5 py-0.5 rounded">
            Testnet
          </span>
        )}
        <HiChevronDown
          className={`w-4 h-4 text-void-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-void-dark border border-void-border rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="p-2 border-b border-void-border">
            <span className="text-sm text-void-muted px-2">Select Network</span>
          </div>
          <div className="p-1 max-h-80 overflow-y-auto">
            {CHAINS.map((chain) => (
              <button
                key={chain.id}
                onClick={() => {
                  switchChain?.({ chainId: chain.id });
                  setIsOpen(false);
                  onSelect?.();
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors ${
                  chain.id === chainId
                    ? 'bg-void-accent/10 text-void-accent'
                    : 'hover:bg-void-gray text-void-text'
                }`}
              >
                <Image
                  src={chain.icon}
                  alt={chain.name}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <span className="font-medium">{chain.name}</span>
                {isTestnet(chain) && (
                  <span className="text-xs text-void-muted bg-void-light px-1.5 py-0.5 rounded">
                    Testnet
                  </span>
                )}
                {chain.id === chainId && <HiCheckCircle className="w-4 h-4 ml-auto" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

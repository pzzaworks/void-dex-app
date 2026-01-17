'use client';

import { useEffect, useState } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { mainnet, polygon, arbitrum, bsc, sepolia } from 'wagmi/chains';
import { HiExclamationTriangle } from 'react-icons/hi2';
import { useEnabledNetworks } from '@/hooks/useSettings';

// Storage key for dismissed state
const DISMISSED_KEY = 'voiddex_network_switch_dismissed';

// Chain ID to chain config mapping
const CHAIN_MAP: Record<number, { id: number; name: string }> = {
  [mainnet.id]: mainnet,
  [polygon.id]: polygon,
  [arbitrum.id]: arbitrum,
  [bsc.id]: bsc,
  [sepolia.id]: sepolia,
};

export function NetworkSwitchModal() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const { networks: enabledNetworks, isLoading: networksLoading } = useEnabledNetworks();
  const [dismissed, setDismissed] = useState(true); // Start dismissed to avoid flash

  // Get enabled chain IDs
  const enabledChainIds = enabledNetworks.map((n) => n.chainId);

  // Target chain (first enabled network, fallback to Sepolia)
  const targetChainId = enabledChainIds[0] || sepolia.id;
  const targetChain = CHAIN_MAP[targetChainId] || sepolia;

  // Check if on wrong network
  const isWrongNetwork = isConnected && !networksLoading && !enabledChainIds.includes(chainId);

  // Load dismissed state from session storage on mount
  useEffect(() => {
    const wasDismissed = sessionStorage.getItem(DISMISSED_KEY);
    setDismissed(!!wasDismissed);
  }, []);

  // Reset dismissed state when network changes to correct one
  useEffect(() => {
    if (!isWrongNetwork) {
      sessionStorage.removeItem(DISMISSED_KEY);
      setDismissed(false);
    }
  }, [isWrongNetwork]);

  const handleSwitch = () => {
    switchChain({ chainId: targetChainId });
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  // Don't show if not connected, on correct network, or dismissed
  if (!isWrongNetwork || dismissed) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={handleDismiss} />

      {/* Modal */}
      <div className="relative w-full max-w-sm mx-4 bg-void-dark border border-void-border rounded-2xl p-6">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <HiExclamationTriangle className="w-12 h-12 text-void-warning" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-void-white text-center mb-2">
          Wrong Network
        </h2>

        {/* Description */}
        <p className="text-sm text-void-muted text-center mb-6">
          Please switch your network to continue.
        </p>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleSwitch}
            disabled={isPending}
            className="w-full py-3 px-4 bg-void-accent text-void-black rounded-xl text-sm font-semibold hover:bg-void-accent-hover transition-colors disabled:opacity-50"
          >
            {isPending ? 'Switching...' : `Switch to ${targetChain.name}`}
          </button>

          <button
            onClick={handleDismiss}
            className="w-full py-3 px-4 bg-void-gray text-void-muted rounded-xl text-sm font-medium hover:text-void-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

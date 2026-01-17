'use client';

import { useState } from 'react';
import Image from 'next/image';
import { HiChevronDown, HiCheckCircle } from 'react-icons/hi2';
import { NetworkNameType } from '@/services/railgun';

interface Network {
  name: string;
  icon: string;
}

interface NetworkSelectorProps {
  selectedNetwork: NetworkNameType;
  networks: Record<string, Network>;
  onNetworkChange: (network: NetworkNameType) => void;
}

export function NetworkSelector({
  selectedNetwork,
  networks,
  onNetworkChange,
}: NetworkSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  // Check if network is a testnet
  const isTestnet = (networkKey: string) => {
    return (
      networkKey.includes('Sepolia') ||
      networkKey.includes('Amoy') ||
      networkKey.includes('Goerli') ||
      networkKey.includes('Mumbai')
    );
  };

  return (
    <div>
      <label className="block text-sm text-void-muted mb-1.5">Network</label>
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center justify-between px-4 py-3 bg-void-gray rounded-xl text-void-white hover:bg-void-light transition-colors"
        >
          <div className="flex items-center gap-2">
            <Image
              src={networks[selectedNetwork]?.icon || '/networks/ethereum.svg'}
              alt={networks[selectedNetwork]?.name || 'Network'}
              width={24}
              height={24}
              className="rounded-full"
            />
            <span className="font-medium">
              {networks[selectedNetwork]?.name || selectedNetwork}
            </span>
            {isTestnet(selectedNetwork) && (
              <span className="text-xs text-void-muted bg-void-light px-2 py-0.5 rounded">
                Testnet
              </span>
            )}
          </div>
          <HiChevronDown
            className={`w-5 h-5 text-void-muted transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          />
        </button>

        {showDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
            <div className="absolute top-full left-0 right-0 mt-2 bg-void-dark border border-void-border rounded-xl shadow-2xl overflow-hidden z-20">
              {Object.entries(networks).map(([networkKey, network]) => (
                <button
                  key={networkKey}
                  onClick={() => {
                    onNetworkChange(networkKey as NetworkNameType);
                    setShowDropdown(false);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-3 hover:bg-void-gray transition-colors ${
                    selectedNetwork === networkKey ? 'bg-void-gray' : ''
                  }`}
                >
                  <Image
                    src={network.icon}
                    alt={network.name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  <span className="font-medium text-void-white">{network.name}</span>
                  {isTestnet(networkKey) && (
                    <span className="text-xs text-void-muted bg-void-light px-2 py-0.5 rounded">
                      Testnet
                    </span>
                  )}
                  {selectedNetwork === networkKey && (
                    <HiCheckCircle className="w-5 h-5 text-void-accent ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

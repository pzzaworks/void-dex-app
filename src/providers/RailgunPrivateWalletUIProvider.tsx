'use client';

import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { OnboardingModal } from '@/components/onboarding';
import { RailgunWalletModal, ShieldModal, TransferModal, ReceiveModal } from '@/components/wallet';

type WalletView = 'none' | 'onboarding' | 'unlock' | 'shield' | 'unshield' | 'transfer' | 'receive';

// Token info for preselection
export interface PreselectedToken {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logo?: string;
}

interface RailgunPrivateWalletUIContextValue {
  // Current UI state
  currentView: WalletView;

  // UI actions - can be used anywhere in the app
  openOnboarding: () => void;
  openUnlock: () => void;
  openShield: (token?: PreselectedToken) => void;
  openUnshield: (token?: PreselectedToken) => void;
  openTransfer: () => void;
  openReceive: () => void;
  closeView: () => void;
}

const RailgunPrivateWalletUIContext = createContext<RailgunPrivateWalletUIContextValue | null>(
  null,
);

export function RailgunPrivateWalletUIProvider({ children }: { children: React.ReactNode }) {
  const [currentView, setCurrentView] = useState<WalletView>('none');
  const [preselectedToken, setPreselectedToken] = useState<PreselectedToken | null>(null);

  const openOnboarding = useCallback(() => {
    setCurrentView('onboarding');
  }, []);

  const openUnlock = useCallback(() => {
    setCurrentView('unlock');
  }, []);

  const openShield = useCallback((token?: PreselectedToken) => {
    setPreselectedToken(token || null);
    setCurrentView('shield');
  }, []);

  const openUnshield = useCallback((token?: PreselectedToken) => {
    setPreselectedToken(token || null);
    setCurrentView('unshield');
  }, []);

  const openTransfer = useCallback(() => {
    setCurrentView('transfer');
  }, []);

  const openReceive = useCallback(() => {
    setCurrentView('receive');
  }, []);

  const closeView = useCallback(() => {
    setCurrentView('none');
    setPreselectedToken(null);
  }, []);

  const value = useMemo(
    () => ({
      currentView,
      openOnboarding,
      openUnlock,
      openShield,
      openUnshield,
      openTransfer,
      openReceive,
      closeView,
    }),
    [
      currentView,
      openOnboarding,
      openUnlock,
      openShield,
      openUnshield,
      openTransfer,
      openReceive,
      closeView,
    ],
  );

  return (
    <RailgunPrivateWalletUIContext.Provider value={value}>
      {children}

      {/* Global UI views - rendered once, controlled centrally */}
      <OnboardingModal isOpen={currentView === 'onboarding'} onClose={closeView} />

      <RailgunWalletModal isOpen={currentView === 'unlock'} onClose={closeView} />

      <ShieldModal
        isOpen={currentView === 'shield' || currentView === 'unshield'}
        onClose={closeView}
        initialMode={currentView === 'shield' ? 'shield' : 'unshield'}
        initialToken={preselectedToken}
      />

      <TransferModal isOpen={currentView === 'transfer'} onClose={closeView} />

      <ReceiveModal isOpen={currentView === 'receive'} onClose={closeView} />
    </RailgunPrivateWalletUIContext.Provider>
  );
}

export function useRailgunPrivateWalletUI() {
  const context = useContext(RailgunPrivateWalletUIContext);
  if (!context) {
    throw new Error(
      'useRailgunPrivateWalletUI must be used within a RailgunPrivateWalletUIProvider',
    );
  }
  return context;
}

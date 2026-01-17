'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRailgun } from '@/providers/RailgunProvider';

export type PrivacyLevel = 'full' | 'partial';

interface PrivacyState {
  level: PrivacyLevel;
  isRailgunWallet: boolean;
  hasShieldedBalance: boolean;
}

const STORAGE_KEY = 'voiddex_privacy_mode';

export function usePrivacy() {
  const { isReady: isRailgunReady, wallet, balances } = useRailgun();
  const [privacyState, setPrivacyState] = useState<PrivacyState>({
    level: 'partial',
    isRailgunWallet: false,
    hasShieldedBalance: false,
  });

  // Update privacy state based on RAILGUN wallet status and actual balances
  useEffect(() => {
    if (isRailgunReady && wallet) {
      // Check if user has any shielded balance
      const hasBalance = balances && Object.keys(balances).length > 0 &&
        Object.values(balances).some(balance => BigInt(balance.amount || '0') > BigInt(0));

      setPrivacyState({
        level: 'full',
        isRailgunWallet: true,
        hasShieldedBalance: hasBalance,
      });
    } else {
      // No RAILGUN wallet - partial privacy only
      const stored = localStorage.getItem(STORAGE_KEY);
      setPrivacyState({
        level: stored === 'full' ? 'full' : 'partial',
        isRailgunWallet: false,
        hasShieldedBalance: false,
      });
    }
  }, [isRailgunReady, wallet, balances]);

  const setPrivacyLevel = useCallback((level: PrivacyLevel) => {
    setPrivacyState((prev) => ({ ...prev, level }));
    localStorage.setItem(STORAGE_KEY, level);
  }, []);

  const getPrivacyLabel = useCallback(() => {
    if (privacyState.isRailgunWallet) {
      return 'Full Privacy';
    }
    return privacyState.level === 'full' ? 'Full Privacy' : 'Partial Privacy';
  }, [privacyState]);

  const getPrivacyDescription = useCallback(() => {
    if (privacyState.level === 'full' && privacyState.isRailgunWallet) {
      return 'Your transaction will be fully private using your shielded RAILGUN balance';
    }
    if (privacyState.level === 'full') {
      return 'Your transaction will be fully private using Railgun shielded balances';
    }
    return 'Your transaction will be shielded, swapped, then unshielded';
  }, [privacyState.level, privacyState.isRailgunWallet]);

  return {
    ...privacyState,
    setPrivacyLevel,
    getPrivacyLabel,
    getPrivacyDescription,
  };
}

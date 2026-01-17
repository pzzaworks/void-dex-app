'use client';

import { useRailgun } from '@/providers/RailgunProvider';
import { HiShieldCheck, HiShieldExclamation } from 'react-icons/hi2';

export function PrivacyStatusIndicator() {
  const { isReady, providerStatus } = useRailgun();

  // Don't show anything if no wallet
  if (!isReady) {
    return null;
  }

  // Provider loading/syncing state
  if (providerStatus === 'loading') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-void-gray/50 text-void-muted text-sm">
        <div className="w-4 h-4 border-2 border-void-accent border-t-transparent rounded-full animate-spin" />
        <span>Syncing...</span>
      </div>
    );
  }

  // Provider error state
  if (providerStatus === 'error') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-sm">
        <HiShieldExclamation className="w-5 h-5" />
        <span>Offline</span>
      </div>
    );
  }

  // Provider ready state - shielded
  if (providerStatus === 'ready') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-void-accent/10 text-void-accent text-sm">
        <HiShieldCheck className="w-5 h-5" />
        <span>Shielded</span>
      </div>
    );
  }

  // Idle state - wallet ready but provider not loaded yet
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-void-gray/50 text-void-muted text-sm">
      <div className="w-4 h-4 border-2 border-void-muted border-t-transparent rounded-full animate-spin" />
      <span>Connecting...</span>
    </div>
  );
}

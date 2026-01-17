'use client';

import { useEffect, useState } from 'react';
import { useRailgun, type PrivacyLoadingStage } from '@/providers/RailgunProvider';

const STAGE_LABELS: Record<PrivacyLoadingStage, string> = {
  idle: 'Preparing...',
  initializing_engine: 'Starting privacy engine',
  loading_wallet: 'Loading wallet',
  checking_artifacts: 'Checking cryptographic files',
  downloading_artifacts: 'Downloading cryptographic files',
  connecting_network: 'Connecting to network',
  syncing_data: 'Syncing blockchain data',
  ready: 'Ready',
  error: 'Connection failed',
};

interface SetupViewProps {
  onComplete: () => void;
  onError?: (error: string) => void;
}

export function SetupView({ onComplete, onError }: SetupViewProps) {
  const { loadingState, isProviderReady } = useRailgun();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Minimum display time of 1.5s for smooth UX
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Auto-complete when provider is ready AND min time elapsed
  useEffect(() => {
    if (isProviderReady && minTimeElapsed) {
      onComplete();
    }
  }, [isProviderReady, minTimeElapsed, onComplete]);

  // Handle errors
  useEffect(() => {
    if (loadingState.stage === 'error' && onError) {
      onError(loadingState.message);
    }
  }, [loadingState.stage, loadingState.message, onError]);

  const isError = loadingState.stage === 'error';
  const isReady = isProviderReady || loadingState.stage === 'ready';
  const displayMessage = isReady ? 'Ready!' : (STAGE_LABELS[loadingState.stage] || loadingState.message);
  const displayProgress = isReady ? 100 : loadingState.progress;

  return (
    <div className="flex flex-col items-center py-8">
      {/* Icon */}
      <div className="relative mb-6">
        {isError ? (
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-red-500 text-2xl">!</span>
          </div>
        ) : isReady ? (
          <div className="w-16 h-16 flex items-center justify-center">
            <svg className="w-8 h-8 text-void-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-16 h-16 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-void-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-medium text-void-text mb-2">
        {isError ? 'Setup Failed' : isReady ? 'Privacy Ready' : 'Setting Up Privacy'}
      </h3>

      {/* Progress bar */}
      {!isError && (
        <div className="w-full max-w-xs mb-4">
          <div className="h-1 bg-void-gray rounded-full overflow-hidden">
            <div
              className="h-full bg-void-accent transition-all duration-500 ease-out"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Status message */}
      <p className="text-sm text-void-muted text-center">{displayMessage}</p>

      {/* Retry button on error */}
      {isError && (
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2.5 bg-void-accent text-void-bg rounded-xl text-sm font-medium hover:bg-void-accent/90 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

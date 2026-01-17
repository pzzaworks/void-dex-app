'use client';

import { useEffect } from 'react';

/**
 * Global error handler for unhandled promise rejections
 * Suppresses known harmless errors from third-party libraries
 */
export function ErrorBoundary() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Suppress "Chain not found" errors from RAILGUN broadcaster
      // These are expected during broadcaster initialization
      if (event.reason?.message?.includes('Chain not found')) {
        event.preventDefault();
        return;
      }

      // Suppress ERR_BLOCKED_BY_CLIENT from WalletConnect (ad-blocker)
      if (event.reason?.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
        event.preventDefault();
        return;
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}

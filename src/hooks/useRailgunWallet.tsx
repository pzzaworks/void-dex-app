'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import type { RailgunWalletInfo } from '@/services/railgun';
import {
  initializeRailgun,
  isRailgunInitialized,
  generateMnemonic,
  validateMnemonic,
  createPrivateWallet,
  loadPrivateWallet,
  loadPrivateWalletWithKey,
  unloadPrivateWallet,
  getStoredWalletInfo,
  clearStoredWalletInfo,
  hasStoredWallet,
} from '@/services/railgun';

// Global flag to prevent multiple session restore attempts across re-renders
let globalSessionRestoreInProgress = false;

export type RailgunWalletStatus =
  | 'uninitialized' // SDK not initialized
  | 'initializing' // SDK initializing
  | 'no_wallet' // SDK ready, no wallet
  | 'locked' // Wallet exists but locked
  | 'unlocking' // Unlocking wallet
  | 'ready' // Wallet ready to use
  | 'error'; // Error state

interface RailgunWalletState {
  status: RailgunWalletStatus;
  wallet: RailgunWalletInfo | null;
  railgunAddress: string | null;
  encryptionKey: string | null;
  error: string | null;
  isScanning: boolean;
  scanProgress: number;
}

interface RailgunWalletContextValue extends RailgunWalletState {
  // Computed
  isInitialized: boolean;
  isReady: boolean;
  isLocked: boolean;
  hasWallet: boolean;
  // Actions
  createWallet: (password: string, mnemonic?: string) => Promise<{ wallet: RailgunWalletInfo & { encryptionKey: string }; mnemonic: string }>;
  unlockWallet: (password: string) => Promise<RailgunWalletInfo & { encryptionKey: string }>;
  lockWallet: () => Promise<void>;
  deleteWallet: () => Promise<void>;
  newMnemonic: () => string;
  checkMnemonic: (mnemonic: string) => boolean;
}

const RailgunWalletContext = createContext<RailgunWalletContextValue | null>(null);

// Session storage keys
const SESSION_KEY = 'voiddex-wallet-session';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Simple obfuscation for session storage (NOT cryptographically secure, just prevents casual viewing)
const obfuscate = (data: string): string => {
  return btoa(data.split('').reverse().join(''));
};

const deobfuscate = (data: string): string => {
  return atob(data).split('').reverse().join('');
};

export function RailgunWalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RailgunWalletState>({
    status: 'no_wallet',
    wallet: null,
    railgunAddress: null,
    encryptionKey: null,
    error: null,
    isScanning: false,
    scanProgress: 0,
  });

  const initializingRef = useRef(false);
  const autoLockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRestoreAttemptedRef = useRef(false);

  // Save session to storage
  const saveSession = useCallback((walletId: string, encryptionKey: string) => {
    if (typeof window === 'undefined') return;

    const session = {
      walletId,
      encryptionKey,
      expiresAt: Date.now() + SESSION_TIMEOUT,
    };

    try {
      sessionStorage.setItem(SESSION_KEY, obfuscate(JSON.stringify(session)));
    } catch (err) {
      console.warn('[useRailgunWallet] Failed to save session:', err);
    }
  }, []);

  // Load session from storage
  const loadSession = useCallback((): { walletId: string; encryptionKey: string } | null => {
    if (typeof window === 'undefined') return null;

    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (!stored) return null;

      const session = JSON.parse(deobfuscate(stored));

      // Check if session expired
      if (Date.now() > session.expiresAt) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }

      return { walletId: session.walletId, encryptionKey: session.encryptionKey };
    } catch (err) {
      console.warn('[useRailgunWallet] Failed to load session:', err);
      return null;
    }
  }, []);

  // Clear session from storage
  const clearSession = useCallback(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  // Set up auto-lock timer
  const setupAutoLock = useCallback(() => {
    // Clear existing timer
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
    }

    // Set new timer
    autoLockTimerRef.current = setTimeout(() => {
      clearSession();
      setState((prev) => ({
        ...prev,
        status: hasStoredWallet() ? 'locked' : 'no_wallet',
        wallet: null,
        encryptionKey: null,
        error: null,
      }));
    }, SESSION_TIMEOUT);
  }, [clearSession]);

  // Try to restore session on mount (runs only once)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Prevent multiple restore attempts using both ref and global flag
    // Global flag survives React Strict Mode re-renders
    if (sessionRestoreAttemptedRef.current || globalSessionRestoreInProgress) return;
    sessionRestoreAttemptedRef.current = true;
    globalSessionRestoreInProgress = true;

    let mounted = true;

    const storedWallet = getStoredWalletInfo();
    if (!storedWallet) {
      setState((prev) => ({ ...prev, status: 'no_wallet' }));
      globalSessionRestoreInProgress = false;
      return;
    }

    // Try to restore session
    const session = loadSession();
    if (session && session.walletId === storedWallet.walletId) {
      // Session is valid, auto-unlock

      // Start restore immediately (no delay needed)
      (async () => {
        if (!mounted) return;

        try {
          setState((prev) => ({ ...prev, status: 'initializing' }));

          if (!isRailgunInitialized()) {
            await initializeRailgun();
          }

          if (!mounted) return;
          const walletWithKey = await loadPrivateWalletWithKey(
            session.encryptionKey,
            session.walletId,
          );

          if (!mounted) return;
          setState({
            status: 'ready',
            wallet: { id: walletWithKey.id, railgunAddress: walletWithKey.railgunAddress },
            railgunAddress: walletWithKey.railgunAddress,
            encryptionKey: walletWithKey.encryptionKey,
            error: null,
            isScanning: false,
            scanProgress: 0,
          });

          // Set up auto-lock timer
          setupAutoLock();
        } catch {
          if (!mounted) return;
          // Session restore failed - this is expected if HMR reloaded or session expired
          // Don't log as error, just clear session and show locked state
          clearSession();
          setState((prev) => ({
            ...prev,
            status: 'locked',
            railgunAddress: storedWallet.railgunAddress,
          }));
        } finally {
          globalSessionRestoreInProgress = false;
        }
      })();
    } else {
      // No valid session, show as locked
      setState((prev) => ({
        ...prev,
        status: 'locked',
        railgunAddress: storedWallet.railgunAddress,
      }));
      globalSessionRestoreInProgress = false;
    }

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy initialization helper - called before wallet operations
  const ensureInitialized = useCallback(async () => {
    if (isRailgunInitialized()) return;
    if (initializingRef.current) {
      // Wait for initialization to complete
      while (initializingRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return;
    }

    initializingRef.current = true;
    setState((prev) => ({ ...prev, status: 'initializing' }));

    try {
      await initializeRailgun();
      initializingRef.current = false;
    } catch (error) {
      initializingRef.current = false;
      throw error;
    }
  }, []);

  /**
   * Create a new RAILGUN wallet
   */
  const createWallet = useCallback(
    async (password: string, mnemonic?: string) => {
      try {
        setState((prev) => ({ ...prev, status: 'initializing', error: null }));

        // Ensure SDK is initialized before wallet creation
        await ensureInitialized();

        setState((prev) => ({ ...prev, status: 'unlocking' }));

        const walletMnemonic = mnemonic || generateMnemonic();

        if (!validateMnemonic(walletMnemonic)) {
          throw new Error('Invalid mnemonic phrase');
        }

        const walletWithKey = await createPrivateWallet(password, walletMnemonic);

        setState({
          status: 'ready',
          wallet: { id: walletWithKey.id, railgunAddress: walletWithKey.railgunAddress },
          railgunAddress: walletWithKey.railgunAddress,
          encryptionKey: walletWithKey.encryptionKey,
          error: null,
          isScanning: false,
          scanProgress: 0,
        });

        // Save session
        saveSession(walletWithKey.id, walletWithKey.encryptionKey);
        setupAutoLock();

        // Provider loading removed - now lazy loaded on-demand during shield/unshield

        return { wallet: walletWithKey, mnemonic: walletMnemonic };
      } catch (err) {
        setState((prev) => ({
          ...prev,
          status: 'no_wallet',
          error: err instanceof Error ? err.message : 'Failed to create wallet',
        }));
        throw err;
      }
    },
    [ensureInitialized, saveSession, setupAutoLock],
  );

  /**
   * Unlock an existing RAILGUN wallet
   */
  const unlockWallet = useCallback(
    async (password: string) => {
      const storedWallet = getStoredWalletInfo();

      if (!storedWallet) {
        throw new Error('No wallet found');
      }

      try {
        setState((prev) => ({ ...prev, status: 'initializing', error: null }));

        // Ensure SDK is initialized before wallet unlock
        await ensureInitialized();

        setState((prev) => ({ ...prev, status: 'unlocking' }));

        const walletWithKey = await loadPrivateWallet(password, storedWallet.walletId);

        setState({
          status: 'ready',
          wallet: { id: walletWithKey.id, railgunAddress: walletWithKey.railgunAddress },
          railgunAddress: walletWithKey.railgunAddress,
          encryptionKey: walletWithKey.encryptionKey,
          error: null,
          isScanning: false,
          scanProgress: 0,
        });

        // Save session
        saveSession(walletWithKey.id, walletWithKey.encryptionKey);
        setupAutoLock();

        // Initialize broadcaster client (async, don't block unlock)
        // Broadcaster and provider initialization moved to ShieldModal
        // Requires network info and avoids Infura rate limits on wallet unlock

        return walletWithKey;
      } catch (err) {
        setState((prev) => ({
          ...prev,
          status: 'locked',
          error: err instanceof Error ? err.message : 'Failed to unlock wallet',
        }));
        throw err;
      }
    },
    [ensureInitialized, saveSession, setupAutoLock],
  );

  /**
   * Lock the wallet (unload from memory)
   */
  const lockWallet = useCallback(async () => {
    if (state.wallet) {
      try {
        await unloadPrivateWallet(state.wallet.id);
      } catch {
        // Ignore unload errors, wallet will be locked anyway
      }
    }

    // Clear session and timer
    clearSession();
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
      autoLockTimerRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      status: hasStoredWallet() ? 'locked' : 'no_wallet',
      wallet: null,
      encryptionKey: null,
      error: null,
    }));
  }, [state.wallet, clearSession]);

  /**
   * Delete the wallet completely
   */
  const deleteWallet = useCallback(async () => {
    if (state.wallet) {
      try {
        await unloadPrivateWallet(state.wallet.id);
      } catch {
        // Ignore unload errors, wallet will be deleted anyway
      }
    }

    // Clear session and timer
    clearSession();
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
      autoLockTimerRef.current = null;
    }

    clearStoredWalletInfo();

    setState({
      status: 'no_wallet',
      wallet: null,
      railgunAddress: null,
      encryptionKey: null,
      error: null,
      isScanning: false,
      scanProgress: 0,
    });
  }, [state.wallet, clearSession]);

  /**
   * Generate a new mnemonic phrase
   */
  const newMnemonic = useCallback(() => {
    return generateMnemonic();
  }, []);

  /**
   * Validate a mnemonic phrase
   */
  const checkMnemonic = useCallback((mnemonic: string) => {
    return validateMnemonic(mnemonic);
  }, []);

  const value: RailgunWalletContextValue = {
    // State
    ...state,
    // Computed
    isInitialized: state.status !== 'uninitialized' && state.status !== 'initializing',
    isReady: state.status === 'ready',
    isLocked:
      state.status === 'locked' ||
      state.status === 'unlocking' ||
      (state.status === 'initializing' && hasStoredWallet()),
    hasWallet: hasStoredWallet(),
    // Actions
    createWallet,
    unlockWallet,
    lockWallet,
    deleteWallet,
    newMnemonic,
    checkMnemonic,
  };

  return (
    <RailgunWalletContext.Provider value={value}>
      {children}
    </RailgunWalletContext.Provider>
  );
}

export function useRailgunWallet() {
  const context = useContext(RailgunWalletContext);
  if (!context) {
    throw new Error('useRailgunWallet must be used within a RailgunWalletProvider');
  }
  return context;
}

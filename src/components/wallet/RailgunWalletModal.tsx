'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { HiChevronLeft, HiXMark } from 'react-icons/hi2';
import { useRailgun } from '@/providers/RailgunProvider';
import { DeleteWalletConfirmModal } from './DeleteWalletConfirmModal';
import { MainView } from './railgun/views/MainView';
import { CreateView } from './railgun/views/CreateView';
import { PasswordSetView } from './railgun/views/PasswordSetView';
import { ImportView } from './railgun/views/ImportView';
import { UnlockView } from './railgun/views/UnlockView';
import { SetupView } from './railgun/views/SetupView';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/errorParser';

type ModalView = 'main' | 'create' | 'create-confirm' | 'import' | 'unlock' | 'setup';

interface RailgunWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RailgunWalletModal({ isOpen, onClose }: RailgunWalletModalProps) {
  const {
    hasWallet,
    railgunAddress,
    newMnemonic,
    checkMnemonic,
    createWallet,
    unlockWallet,
    deleteWallet,
  } = useRailgun();

  const [view, setView] = useState<ModalView>('main');
  const [mnemonic, setMnemonic] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mnemonicCopied, setMnemonicCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [passwordInputRef, setPasswordInputRef] = useState<HTMLInputElement | null>(null);

  // Track if modal has been initialized for current open session
  const isOpenRef = useRef(isOpen);

  // Reset state when modal opens (only once per open session)
  useEffect(() => {
    const justOpened = isOpen && !isOpenRef.current;
    isOpenRef.current = isOpen;

    if (justOpened) {
      setView(hasWallet ? 'unlock' : 'main');
      setMnemonic('');
      setPassword('');
      setPasswordConfirm('');
      setError(null);
      setMnemonicCopied(false);
    }
  }, [isOpen, hasWallet]);

  // Generate new mnemonic when entering create view
  useEffect(() => {
    if (view === 'create' && !mnemonic) {
      setMnemonic(newMnemonic());
    }
  }, [view, mnemonic, newMnemonic]);

  const handleCreateNew = useCallback(() => {
    setMnemonic(newMnemonic());
    setView('create');
  }, [newMnemonic]);

  const handleImportExisting = useCallback(() => {
    setMnemonic('');
    setView('import');
  }, []);

  const handleCopyMnemonic = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setMnemonicCopied(true);
      setTimeout(() => setMnemonicCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy mnemonic:', err);
    }
  }, [mnemonic]);

  const handleMnemonicConfirmed = useCallback(() => {
    setView('create-confirm');
  }, []);

  const handleCreateWallet = useCallback(async () => {
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await createWallet(password, mnemonic);
      // Go to setup view instead of closing
      setView('setup');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [password, passwordConfirm, mnemonic, createWallet]);

  const handleImportWallet = useCallback(async () => {
    setError(null);

    if (!checkMnemonic(mnemonic.trim())) {
      setError('Invalid recovery phrase');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await createWallet(password, mnemonic.trim());
      // Go to setup view instead of closing
      setView('setup');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [mnemonic, password, passwordConfirm, checkMnemonic, createWallet]);

  const handleUnlockWallet = useCallback(async () => {
    setError(null);

    if (!password) {
      const msg = 'Please enter your password';
      setError(msg);
      toast.error(msg);
      passwordInputRef?.focus();
      return;
    }

    setLoading(true);
    try {
      await unlockWallet(password);
      toast.success('Wallet unlocked');
      setPassword('');
      // Go to setup view instead of closing
      setView('setup');
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      toast.error(errorMessage);

      // Focus password input so user can try again
      setTimeout(() => {
        passwordInputRef?.focus();
        passwordInputRef?.select();
      }, 100);
    } finally {
      setLoading(false);
    }
  }, [password, unlockWallet, passwordInputRef]);

  const handleDeleteWallet = useCallback(async () => {
    await deleteWallet();
    setView('main');
    setShowDeleteConfirm(false);
  }, [deleteWallet]);

  const getHeaderTitle = () => {
    switch (view) {
      case 'main':
        return 'Private Wallet';
      case 'create':
        return 'Create Wallet';
      case 'create-confirm':
        return 'Set Password';
      case 'import':
        return 'Import Wallet';
      case 'unlock':
        return 'Unlock Wallet';
      case 'setup':
        return 'Privacy Setup';
      default:
        return 'Private Wallet';
    }
  };

  // Can't close modal during setup
  const canClose = view !== 'setup';

  const handleBack = () => {
    if (view === 'create-confirm') {
      setView('create');
    } else {
      setView('main');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - can't close during setup */}
      <div
        className="absolute inset-0 bg-black/25 backdrop-blur-sm"
        onClick={canClose ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[calc(100vh-2rem)] bg-void-dark border border-void-border rounded-2xl flex flex-col overflow-hidden">
        {/* Header - Sticky */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-void-border bg-void-dark">
          <div className="flex items-center gap-3">
            {view !== 'main' && view !== 'unlock' && (
              <button
                onClick={handleBack}
                className="text-void-muted hover:text-void-white transition-colors"
              >
                <HiChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-void-white">{getHeaderTitle()}</h2>
          </div>
          {canClose && (
            <button
              onClick={onClose}
              className="text-void-muted hover:text-void-white transition-colors"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {view === 'main' && (
            <MainView onCreateNew={handleCreateNew} onImportExisting={handleImportExisting} />
          )}

          {view === 'create' && (
            <CreateView
              mnemonic={mnemonic}
              onCopyMnemonic={handleCopyMnemonic}
              mnemonicCopied={mnemonicCopied}
              onNext={handleMnemonicConfirmed}
            />
          )}

          {view === 'create-confirm' && (
            <PasswordSetView
              password={password}
              passwordConfirm={passwordConfirm}
              onPasswordChange={setPassword}
              onPasswordConfirmChange={setPasswordConfirm}
              onSubmit={handleCreateWallet}
              loading={loading}
              error={error}
            />
          )}

          {view === 'import' && (
            <ImportView
              mnemonic={mnemonic}
              onMnemonicChange={setMnemonic}
              password={password}
              passwordConfirm={passwordConfirm}
              onPasswordChange={setPassword}
              onPasswordConfirmChange={setPasswordConfirm}
              onSubmit={handleImportWallet}
              loading={loading}
              error={error}
            />
          )}

          {view === 'unlock' && (
            <UnlockView
              railgunAddress={railgunAddress}
              password={password}
              onPasswordChange={setPassword}
              onUnlock={handleUnlockWallet}
              onDelete={() => setShowDeleteConfirm(true)}
              loading={loading}
              error={error}
              passwordInputRef={setPasswordInputRef}
            />
          )}

          {view === 'setup' && (
            <SetupView
              onComplete={onClose}
              onError={(err) => setError(err)}
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteWalletConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteWallet}
      />
    </div>
  );
}

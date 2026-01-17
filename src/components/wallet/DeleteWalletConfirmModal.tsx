'use client';

import { useState } from 'react';
import { HiExclamationTriangle, HiXMark } from 'react-icons/hi2';

interface DeleteWalletConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function DeleteWalletConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: DeleteWalletConfirmModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isConfirmed = confirmText === 'DELETE';

  const handleConfirm = async () => {
    if (!isConfirmed) return;

    setLoading(true);
    try {
      await onConfirm();
      onClose();
      setConfirmText('');
    } catch (error) {
      console.error('Failed to delete wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setConfirmText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[calc(100vh-2rem)] bg-void-dark border border-red-500/30 rounded-2xl flex flex-col overflow-hidden">
        {/* Header - Sticky */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-void-border bg-red-500/10">
          <div className="flex items-center gap-3">
            <HiExclamationTriangle className="w-7 h-7 text-red-400" />
            <h2 className="text-lg font-semibold text-red-400">Delete Wallet</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-void-muted hover:text-void-white transition-colors disabled:opacity-50"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-start gap-3">
            <HiExclamationTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm text-red-200 space-y-2">
              <p className="font-semibold">Make sure you have your recovery phrase!</p>
              <ul className="list-disc list-inside space-y-1 text-red-300">
                <li>Wallet will be removed from this device</li>
                <li>Your funds remain safe on the blockchain</li>
                <li>You can restore anytime with your recovery phrase</li>
              </ul>
            </div>
          </div>

          <div>
            <label className="block text-sm text-void-muted mb-2">
              Type <span className="font-mono text-red-400 font-semibold">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="Type DELETE here"
              disabled={loading}
              className="w-full px-4 py-3 bg-void-gray rounded-xl text-void-white placeholder:text-void-muted focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              disabled={loading}
              className="flex-1 py-3 rounded-xl font-semibold bg-void-gray hover:bg-void-light text-void-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isConfirmed || loading}
              className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                !isConfirmed || loading
                  ? 'bg-void-gray text-void-muted cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-void-muted border-t-white rounded-full animate-spin" />
              )}
              {loading ? 'Deleting...' : 'Delete Wallet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

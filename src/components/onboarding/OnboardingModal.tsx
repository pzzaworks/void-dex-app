'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRailgun } from '@/providers/RailgunProvider';
import { generateMnemonicAsync } from '@/services/railgun';
import { ProgressBar } from './ProgressBar';
import { WelcomeStep } from './steps/WelcomeStep';
import { CreateOrImportStep } from './steps/CreateOrImportStep';
import { ShowMnemonicStep } from './steps/ShowMnemonicStep';
import { VerifyBackupStep } from './steps/VerifyBackupStep';
import { ConfirmMnemonicStep } from './steps/ConfirmMnemonicStep';
import { ImportMnemonicStep } from './steps/ImportMnemonicStep';
import { SetPasswordStep } from './steps/SetPasswordStep';
import { CreatingStep } from './steps/CreatingStep';
import { SuccessStep } from './steps/SuccessStep';
import { HiShieldCheck, HiXMark } from 'react-icons/hi2';
import { getErrorMessage } from '@/lib/errorParser';

type OnboardingStep =
  | 'welcome'
  | 'create-or-import'
  | 'show-mnemonic'
  | 'verify-backup'
  | 'confirm-mnemonic'
  | 'import-mnemonic'
  | 'set-password'
  | 'creating'
  | 'success';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  const { createWallet, checkMnemonic } = useRailgun();

  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [mnemonic, setMnemonic] = useState('');
  const [importMnemonic, setImportMnemonic] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [verifyWords, setVerifyWords] = useState<{ index: number; word: string }[]>([]);
  const [verifyInputs, setVerifyInputs] = useState<string[]>(['', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('welcome');
      setMnemonic('');
      setImportMnemonic('');
      setPassword('');
      setPasswordConfirm('');
      setVerifyWords([]);
      setVerifyInputs(['', '', '']);
      setError(null);
      setIsImporting(false);
    }
  }, [isOpen]);

  // Generate mnemonic when entering show-mnemonic step
  useEffect(() => {
    if (step === 'show-mnemonic' && !mnemonic) {
      generateMnemonicAsync().then(setMnemonic);
    }
  }, [step, mnemonic]);

  // Generate random words to verify when entering confirm-mnemonic step
  useEffect(() => {
    if (step === 'confirm-mnemonic' && mnemonic) {
      const words = mnemonic.split(' ');
      const indices = new Set<number>();
      while (indices.size < 3) {
        indices.add(Math.floor(Math.random() * words.length));
      }
      const sortedIndices = Array.from(indices).sort((a, b) => a - b);
      setVerifyWords(sortedIndices.map((i) => ({ index: i, word: words[i] })));
      setVerifyInputs(['', '', '']);
    }
  }, [step, mnemonic]);

  const handleCreateNew = useCallback(() => {
    setIsImporting(false);
    setStep('show-mnemonic');
  }, []);

  const handleImportExisting = useCallback(() => {
    setIsImporting(true);
    setStep('import-mnemonic');
  }, []);

  const handleVerifyMnemonic = useCallback(() => {
    const isCorrect = verifyWords.every(
      (vw, i) => verifyInputs[i].toLowerCase().trim() === vw.word.toLowerCase(),
    );

    if (!isCorrect) {
      setError('Words do not match. Please check your backup.');
      return;
    }

    setError(null);
    setStep('set-password');
  }, [verifyWords, verifyInputs]);

  const handleImportMnemonicSubmit = useCallback(() => {
    if (!checkMnemonic(importMnemonic.trim())) {
      setError('Invalid recovery phrase. Please enter 12 or 24 words.');
      return;
    }
    setError(null);
    setMnemonic(importMnemonic.trim());
    setStep('set-password');
  }, [importMnemonic, checkMnemonic]);

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

    setStep('creating');

    try {
      await createWallet(password, mnemonic);
      setStep('success');
    } catch (err) {
      setError(getErrorMessage(err));
      setStep('set-password');
    }
  }, [password, passwordConfirm, mnemonic, createWallet]);

  const handleComplete = useCallback(() => {
    onComplete?.();
    onClose();
  }, [onComplete, onClose]);

  const handleVerifyInputChange = useCallback(
    (index: number, value: string) => {
      const newInputs = [...verifyInputs];
      newInputs[index] = value;
      setVerifyInputs(newInputs);
      setError(null);
    },
    [verifyInputs],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-void-dark border border-void-border rounded-2xl overflow-hidden shadow-2xl max-h-[calc(100vh-2rem)] flex flex-col">
        {/* Progress Bar */}
        <ProgressBar step={step} />

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-void-border">
          <div className="flex items-center gap-2">
            <HiShieldCheck className="w-6 h-6 text-void-accent" />
            <h2 className="text-lg font-semibold text-void-white">VoidDEX Privacy</h2>
          </div>
          {step !== 'creating' && (
            <button
              onClick={onClose}
              className="text-void-muted hover:text-void-white transition-colors"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'welcome' && <WelcomeStep onNext={() => setStep('create-or-import')} />}

          {step === 'create-or-import' && (
            <CreateOrImportStep
              onCreateNew={handleCreateNew}
              onImportExisting={handleImportExisting}
              onBack={() => setStep('welcome')}
            />
          )}

          {step === 'show-mnemonic' && (
            <ShowMnemonicStep
              mnemonic={mnemonic}
              onNext={() => setStep('verify-backup')}
              onBack={() => setStep('create-or-import')}
            />
          )}

          {step === 'verify-backup' && (
            <VerifyBackupStep
              onNext={() => setStep('confirm-mnemonic')}
              onBack={() => setStep('show-mnemonic')}
            />
          )}

          {step === 'confirm-mnemonic' && (
            <ConfirmMnemonicStep
              verifyWords={verifyWords}
              verifyInputs={verifyInputs}
              onInputChange={handleVerifyInputChange}
              onNext={handleVerifyMnemonic}
              onBack={() => setStep('verify-backup')}
              error={error}
            />
          )}

          {step === 'import-mnemonic' && (
            <ImportMnemonicStep
              importMnemonic={importMnemonic}
              onMnemonicChange={(value) => {
                setImportMnemonic(value);
                setError(null);
              }}
              onNext={handleImportMnemonicSubmit}
              onBack={() => setStep('create-or-import')}
              error={error}
            />
          )}

          {step === 'set-password' && (
            <SetPasswordStep
              password={password}
              passwordConfirm={passwordConfirm}
              onPasswordChange={setPassword}
              onPasswordConfirmChange={setPasswordConfirm}
              onNext={handleCreateWallet}
              onBack={() => setStep(isImporting ? 'import-mnemonic' : 'confirm-mnemonic')}
              error={error}
            />
          )}

          {step === 'creating' && <CreatingStep />}

          {step === 'success' && <SuccessStep onComplete={handleComplete} />}
        </div>
      </div>
    </div>
  );
}

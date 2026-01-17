'use client';

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

interface ProgressBarProps {
  step: OnboardingStep;
}

export function ProgressBar({ step }: ProgressBarProps) {
  if (step === 'welcome' || step === 'success') {
    return null;
  }

  const progress = getProgress(step);

  return (
    <div className="h-1 bg-void-gray">
      <div
        className="h-full bg-void-accent transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function getProgress(step: OnboardingStep): number {
  switch (step) {
    case 'create-or-import':
      return 14;
    case 'show-mnemonic':
      return 28;
    case 'verify-backup':
      return 42;
    case 'confirm-mnemonic':
      return 56;
    case 'import-mnemonic':
      return 42;
    case 'set-password':
      return 70;
    case 'creating':
      return 85;
    default:
      return 100;
  }
}

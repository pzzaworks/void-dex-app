'use client';

import { useMemo } from 'react';
import { HiCheck } from 'react-icons/hi2';

interface ProcessingStepProps {
  mode: 'shield' | 'unshield';
  progress?: number;
  status?: string;
}

const STEPS = ['Preparing', 'Proving', 'Finalizing'];

export function ProcessingStep({ mode, progress = 0, status = '' }: ProcessingStepProps) {
  const currentStep = useMemo(() => {
    if (progress >= 90) return 2; // Finalizing
    if (progress >= 20) return 1; // Proving
    return 0;                      // Preparing
  }, [progress]);

  // Shield mode
  if (mode === 'shield') {
    return (
      <div className="py-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-void-accent/30 border-t-void-accent rounded-full animate-spin" />
        <h3 className="text-lg font-semibold text-void-white mb-2">Shielding Tokens...</h3>
        <p className="text-sm text-void-muted mb-4">Please confirm the transactions in your wallet.</p>
        <p className="text-xs text-void-accent">Please do not close or refresh this page</p>
      </div>
    );
  }

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="py-6">
      {/* Circle */}
      <div className="relative w-28 h-28 mx-auto mb-4">
        <svg className="w-full h-full" style={{ transform: 'rotate(-90deg)' }} viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="6" className="stroke-void-gray" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            strokeWidth="6"
            className="stroke-void-accent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.3s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold text-void-white">{progress.toFixed(0)}%</span>
        </div>
      </div>

      {/* Status */}
      <p className="text-sm text-void-muted text-center mb-5">{status || 'Preparing...'}</p>

      {/* Steps */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          const isLast = i === STEPS.length - 1;

          return (
            <div key={step} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium transition-colors ${
                    done
                      ? 'bg-void-success text-void-black'
                      : active
                        ? 'bg-void-accent text-void-black'
                        : 'bg-void-gray text-void-muted'
                  }`}
                >
                  {done ? <HiCheck className="w-3 h-3" /> : i + 1}
                </div>
                <span className={`text-xs transition-colors ${
                  done ? 'text-void-success' : active ? 'text-void-white' : 'text-void-muted'
                }`}>
                  {step}
                </span>
              </div>
              {!isLast && (
                <div className={`w-6 h-px transition-colors ${done ? 'bg-void-success' : 'bg-void-gray'}`} />
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-void-muted text-center mt-5">
        This may take up to a minute
      </p>

      <p className="text-xs text-void-accent text-center mt-3">
        Please do not close or refresh this page
      </p>
    </div>
  );
}

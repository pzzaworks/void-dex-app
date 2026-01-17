'use client';

import { useEffect } from 'react';
import {
  HiXMark,
  HiLockClosed,
  HiArrowsRightLeft,
  HiCheckBadge,
} from 'react-icons/hi2';
import type { QuoteResponse } from '@/types';

// Railgun protocol fee constant
const RAILGUN_UNSHIELD_FEE_BPS = 25; // 0.25%

interface RouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteResponse | null;
  isRailgunWallet?: boolean;
}

export function RouteModal({ isOpen, onClose, quote, isRailgunWallet = false }: RouteModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !quote) return null;

  const { route, fromToken, toToken, fromAmount, toAmount } = quote;

  // For Railgun wallets, calculate net amounts after unshield fee (0.25%)
  // This reflects the actual amounts that flow through the swap
  const feeMultiplier = isRailgunWallet
    ? (10000 - RAILGUN_UNSHIELD_FEE_BPS) / 10000
    : 1;

  const netFromAmount = parseFloat(fromAmount) * feeMultiplier;
  const netToAmount = parseFloat(toAmount) * feeMultiplier;

  // Build route steps for display
  const routeSteps: Array<{
    icon: 'wallet' | 'swap';
    label: string;
    sublabel?: string;
    percentage?: number;
    isPrivate: boolean;
  }> = [];

  // Source wallet - shows original balance amount
  routeSteps.push({
    icon: 'wallet',
    label: isRailgunWallet ? 'Private Balance' : 'Your Wallet',
    sublabel: `${parseFloat(fromAmount).toFixed(6)} ${fromToken}`,
    isPrivate: isRailgunWallet,
  });

  // DEX swap steps - show net amounts after fees
  for (const step of route.steps) {
    const stepFromAmount = parseFloat(step.fromAmount) * feeMultiplier;
    const stepToAmount = parseFloat(step.toAmount) * feeMultiplier;

    routeSteps.push({
      icon: 'swap',
      label: step.dexName,
      sublabel: `${stepFromAmount.toFixed(6)} ${step.fromToken} → ${stepToAmount.toFixed(6)} ${step.toToken}`,
      percentage: step.percentage,
      isPrivate: isRailgunWallet,
    });
  }

  // Destination wallet - shows net received amount
  routeSteps.push({
    icon: 'wallet',
    label: isRailgunWallet ? 'Private Balance' : 'Your Wallet',
    sublabel: `${netToAmount.toFixed(6)} ${toToken}`,
    isPrivate: isRailgunWallet,
  });

  const getStepIcon = (icon: string, isPrivate: boolean) => {
    switch (icon) {
      case 'wallet':
        return (
          <div className={`w-10 h-10 ${isPrivate ? 'bg-void-success/10' : 'bg-void-gray'} rounded-full flex items-center justify-center`}>
            <HiLockClosed className={`w-5 h-5 ${isPrivate ? 'text-void-success' : 'text-void-muted'}`} />
          </div>
        );
      case 'swap':
        return (
          <div className="w-10 h-10 bg-void-accent/10 rounded-full flex items-center justify-center">
            <HiArrowsRightLeft className="w-5 h-5 text-void-accent" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-void-dark border border-void-border rounded-2xl shadow-2xl max-h-[85vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-void-border">
          <h3 className="text-lg font-semibold text-void-white">Transaction Route</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-void-muted hover:text-void-white hover:bg-void-gray rounded-lg transition-colors"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Route Visualization */}
        <div className="p-5">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-5 bottom-5 w-px bg-void-border" />

            {/* Steps */}
            <div className="space-y-4">
              {routeSteps.map((step, index) => {
                const isWallet = step.icon === 'wallet';

                return (
                  <div
                    key={index}
                    className="relative flex items-center gap-4"
                  >
                    {/* Icon */}
                    <div className="relative z-10 bg-void-dark">
                      {getStepIcon(step.icon, step.isPrivate)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${isWallet ? (step.isPrivate ? 'text-void-success' : 'text-void-white') : 'text-void-accent'}`}>
                          {step.label}
                        </span>
                        {step.percentage !== undefined && (
                          <span className="text-xs px-1.5 py-0.5 bg-void-accent/20 text-void-accent rounded font-medium">
                            {step.percentage.toFixed(0)}%
                          </span>
                        )}
                        {step.isPrivate && !isWallet && (
                          <span className="text-xs px-1.5 py-0.5 bg-void-success/20 text-void-success rounded font-medium">
                            Private
                          </span>
                        )}
                      </div>
                      {step.sublabel && (
                        <div className="text-sm text-void-muted mt-0.5">
                          {step.sublabel}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-void-border bg-void-success/5 rounded-b-2xl">
          <div className="flex items-center gap-2">
            <HiCheckBadge className="w-5 h-5 text-void-success shrink-0" />
            <span className="text-sm text-void-success font-medium">
              {isRailgunWallet
                ? 'Your privacy is protected via Railgun'
                : 'Best rate found across DEXes'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

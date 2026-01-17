'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { PrivacyStatusIndicator } from '@/components/header/PrivacyStatusIndicator';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { chain } = useAccount();
  const isSepolia = chain?.id === 11155111;
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile: Centered stacked layout
  if (isMobile) {
    return (
      <footer className="w-full">
        <div className="px-4 py-6 flex flex-col items-center space-y-4">
          {/* Links */}
          <div className="flex items-center justify-center gap-6">
            <Link
              href="/docs"
              className="text-sm text-void-muted hover:text-void-text transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/terms"
              className="text-sm text-void-muted hover:text-void-text transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-void-muted hover:text-void-text transition-colors"
            >
              Privacy
            </Link>
          </div>

          {/* Privacy Status */}
          <PrivacyStatusIndicator />

          {/* Copyright */}
          <div className="text-xs text-void-muted">
            &copy; {currentYear} VoidDex{isSepolia && ' Testnet'}
          </div>
        </div>
      </footer>
    );
  }

  // Desktop: Original horizontal layout
  return (
    <footer className="w-full">
      <div className="max-w-7xl mx-auto px-4 py-4 relative flex items-center justify-center">
        {/* Left: Copyright - absolutely positioned */}
        <div className="absolute left-4 text-sm text-void-muted">
          &copy; {currentYear} VoidDex{isSepolia && ' Testnet'}
        </div>

        {/* Center: Links - truly centered */}
        <div className="flex items-center gap-6">
          <Link
            href="/docs"
            className="text-sm text-void-muted hover:text-void-text transition-colors"
          >
            Docs
          </Link>
          <Link
            href="/terms"
            className="text-sm text-void-muted hover:text-void-text transition-colors"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-void-muted hover:text-void-text transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/cookies"
            className="text-sm text-void-muted hover:text-void-text transition-colors"
          >
            Cookies
          </Link>
        </div>

        {/* Right: Privacy Status - absolutely positioned */}
        <div className="absolute right-4 flex items-center">
          <PrivacyStatusIndicator />
        </div>
      </div>
    </footer>
  );
}

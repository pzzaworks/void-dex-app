'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setIsVisible(false);
  };

  const declineCookies = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-16 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 bg-void-dark border border-void-border rounded-xl p-4 shadow-2xl">
      <div className="text-sm text-void-text mb-3">
        We use cookies to enhance your experience. By continuing to use VoidDex, you agree to our{' '}
        <Link href="/cookies" className="text-void-accent hover:underline">
          Cookie Policy
        </Link>
        .
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={acceptCookies}
          className="flex-1 py-2 px-4 bg-void-accent hover:bg-void-accent-hover text-void-black font-medium rounded-lg transition-colors text-sm"
        >
          Accept
        </button>
        <button
          onClick={declineCookies}
          className="flex-1 py-2 px-4 bg-void-gray hover:bg-void-light text-void-text font-medium rounded-lg transition-colors text-sm"
        >
          Decline
        </button>
      </div>
    </div>
  );
}

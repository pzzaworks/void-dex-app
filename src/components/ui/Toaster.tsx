'use client';

import { Toaster as HotToaster } from 'react-hot-toast';

export function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      containerStyle={{
        bottom: 80,
      }}
      toastOptions={{
        duration: 4000,
        style: {
          background: '#1a1a1a',
          color: '#e5e5e5',
          border: '1px solid #2a2a2a',
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '14px',
          maxWidth: '400px',
        },
        success: {
          iconTheme: {
            primary: '#c8ff00',
            secondary: '#0a0a0a',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#0a0a0a',
          },
          style: {
            border: '1px solid rgba(239, 68, 68, 0.3)',
          },
        },
        loading: {
          iconTheme: {
            primary: '#c8ff00',
            secondary: '#0a0a0a',
          },
        },
      }}
    />
  );
}

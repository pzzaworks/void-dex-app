'use client';

import { WagmiProvider, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, Theme } from '@rainbow-me/rainbowkit';
import { config } from '@/lib/wagmi';
import { RailgunWalletProvider } from '@/hooks/useRailgunWallet';
import { RailgunProvider } from './RailgunProvider';
import { RailgunPrivateWalletUIProvider } from './RailgunPrivateWalletUIProvider';
import { FeeSettingsProvider } from './FeeSettingsProvider';
import '@rainbow-me/rainbowkit/styles.css';

// Configure QueryClient with aggressive caching to avoid 429 rate limit errors
// Public RPCs have strict rate limits, so we minimize refetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 60 seconds before refetching
      staleTime: 60_000,
      // Cache data for 5 minutes
      gcTime: 5 * 60_000,
      // Don't refetch on window focus (reduces RPC calls)
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect
      refetchOnReconnect: false,
      // Don't refetch on mount if data exists
      refetchOnMount: false,
      // Retry failed requests with exponential backoff
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Filter out noisy Waku logs - run immediately on module load
const FILTERED_LOG_PATTERNS = [
  'Ignore WebSocket connection failures',
  'Waku tries to discover peers',
  'Not recommended for production',
];

if (typeof window !== 'undefined') {
  const originalLog = console.log;
  const originalWarn = console.warn;

  const shouldFilter = (args: unknown[]) => {
    const message = args.map((a) => (typeof a === 'string' ? a : '')).join(' ');
    return FILTERED_LOG_PATTERNS.some((pattern) => message.includes(pattern));
  };

  console.log = (...args: unknown[]) => {
    if (!shouldFilter(args)) {
      originalLog.apply(console, args);
    }
  };

  console.warn = (...args: unknown[]) => {
    if (!shouldFilter(args)) {
      originalWarn.apply(console, args);
    }
  };
}

// VoidDex custom RainbowKit theme (Gray-Yellow theme)
const voidDexTheme: Theme = darkTheme({
  accentColor: '#e4b940', // VoidDex yellow/gold accent
  accentColorForeground: '#000000', // Black text on yellow button
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small',
});

// Deep customization to match VoidDex gray-yellow design system
voidDexTheme.colors.modalBackground = '#111111'; // void-dark
voidDexTheme.colors.modalBorder = '#2a2a2a'; // void-border
voidDexTheme.colors.generalBorder = '#2a2a2a';
voidDexTheme.colors.menuItemBackground = '#1a1a1a'; // void-gray
voidDexTheme.colors.modalText = '#d4d4d4'; // void-text
voidDexTheme.colors.modalTextSecondary = '#666666'; // void-muted
voidDexTheme.colors.closeButton = '#666666';
voidDexTheme.colors.closeButtonBackground = '#1a1a1a';
voidDexTheme.radii.modal = '16px'; // rounded-xl
voidDexTheme.radii.menuButton = '12px';
voidDexTheme.radii.actionButton = '12px';

// Inner providers that need access to wagmi hooks
function InnerProviders({ children }: { children: React.ReactNode }) {
  const { chainId } = useAccount();

  return (
    <FeeSettingsProvider chainId={chainId}>
      <RailgunWalletProvider>
        <RailgunProvider>
          <RailgunPrivateWalletUIProvider>{children}</RailgunPrivateWalletUIProvider>
        </RailgunProvider>
      </RailgunWalletProvider>
    </FeeSettingsProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={voidDexTheme} modalSize="wide" showRecentTransactions={true}>
          <InnerProviders>{children}</InnerProviders>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

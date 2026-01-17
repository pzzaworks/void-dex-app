import type { Metadata } from 'next';
import { Inconsolata } from 'next/font/google';
import { Providers } from '@/providers';
import { CookieBanner } from '@/components/CookieBanner';
import { Toaster } from '@/components/ui/Toaster';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NetworkSwitchModal } from '@/components/NetworkSwitchModal';
import { RootProvider } from 'fumadocs-ui/provider/next';
import '@/styles/globals.css';

const inconsolata = Inconsolata({
  subsets: ['latin'],
  variable: '--font-inconsolata',
});

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: 'VoidDex',
  description:
    'VoidDex is a privacy-first DEX aggregator that combines the best swap rates across decentralized exchanges with Railgun\'s zero-knowledge privacy technology.',
  keywords: [
    'privacy',
    'defi',
    'dex',
    'dex aggregator',
    'private swap',
    'ethereum',
    'railgun',
    'zero knowledge',
    'zk privacy',
    'private transactions',
    'crypto privacy',
    'token swap',
    'decentralized exchange',
    'web3 privacy',
    'anonymous trading',
    'private defi',
  ],
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'VoidDex',
    description: 'VoidDex is a privacy-first DEX aggregator that combines the best swap rates across decentralized exchanges with Railgun\'s zero-knowledge privacy technology.',
    url: 'http://localhost:3000',
    siteName: 'VoidDex',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'VoidDex - Trade private, stay invisible',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VoidDex',
    description: 'VoidDex is a privacy-first DEX aggregator that combines the best swap rates across decentralized exchanges with Railgun\'s zero-knowledge privacy technology.',
    images: ['/og-image.jpg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inconsolata.variable} suppressHydrationWarning>
      <body className="font-mono bg-void-dark text-void-text antialiased">
        <RootProvider theme={{ defaultTheme: 'dark', forcedTheme: 'dark' }}>
          <Providers>
            <ErrorBoundary />
            {children}
            <NetworkSwitchModal />
            <CookieBanner />
            <Toaster />
          </Providers>
        </RootProvider>
      </body>
    </html>
  );
}

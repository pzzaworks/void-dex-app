'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAccount, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { mainnet, polygon, arbitrum, bsc, sepolia } from 'wagmi/chains';
import {
  HiOutlineBars3,
  HiXMark,
  HiDocumentText,
  HiGlobeAlt,
  HiWallet,
  HiLockClosed,
  HiLockOpen,
  HiChevronRight,
  HiArrowLeft,
  HiClipboardDocument,
  HiCheck,
  HiArrowRightOnRectangle,
  HiPaperAirplane,
  HiShieldCheck,
  HiPlus,
  HiCheckCircle,
} from 'react-icons/hi2';
import { Logo } from '@/components/ui/Logo';
import { NetworkSelector } from './NetworkSelector';
import { ProfileButton } from './ProfileButton';
import { UnifiedProfileButton } from './UnifiedProfileButton';
import { useRailgun } from '@/providers/RailgunProvider';
import { useRailgunPrivateWalletUI } from '@/providers/RailgunPrivateWalletUIProvider';
import { useEnabledNetworks } from '@/hooks/useSettings';
import { formatAddress } from '@/lib/format';

// All supported chains with their icons
const ALL_CHAINS = [
  { ...mainnet, icon: '/networks/ethereum.svg' },
  { ...polygon, icon: '/networks/polygon.svg' },
  { ...arbitrum, icon: '/networks/arbitrum.svg' },
  { ...bsc, icon: '/networks/bsc.svg' },
  { ...sepolia, icon: '/networks/ethereum.svg' },
];

const CHAIN_MAP = Object.fromEntries(ALL_CHAINS.map((c) => [c.id, c]));

interface HeaderProps {
  apiHealthy?: boolean;
}

type MobileMenuView = 'main' | 'network' | 'wallet';

export function Header({ apiHealthy = true }: HeaderProps) {
  const { isConnected, chain, address } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { networks: enabledNetworks } = useEnabledNetworks();
  const { isReady, hasWallet, railgunAddress, lockWallet, providerStatus } = useRailgun();
  const isSyncing = providerStatus === 'loading';
  const { openOnboarding, openUnlock, openTransfer, openShield, openUnshield, openReceive } =
    useRailgunPrivateWalletUI();

  const isSepolia = chain?.id === 11155111;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<MobileMenuView>('main');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isMobile, setIsMobile] = useState(false);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [copiedPrivate, setCopiedPrivate] = useState(false);

  // Filter chains based on API-enabled networks
  const CHAINS = useMemo(() => {
    if (enabledNetworks.length === 0) {
      return [ALL_CHAINS.find((c) => c.id === sepolia.id)!];
    }
    return enabledNetworks
      .map((n) => CHAIN_MAP[n.chainId])
      .filter(Boolean);
  }, [enabledNetworks]);

  const isTestnet = (c: (typeof CHAINS)[0]) => c.id === sepolia.id || c.testnet === true;

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close menu on resize to desktop
  useEffect(() => {
    if (!isMobile) {
      setMobileMenuOpen(false);
    }
  }, [isMobile]);

  // Reset view when menu closes
  useEffect(() => {
    if (!mobileMenuOpen) {
      setMenuView('main');
    }
  }, [mobileMenuOpen]);

  const handleCopyPublic = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopiedPublic(true);
      setTimeout(() => setCopiedPublic(false), 2000);
    }
  };

  const handleCopyPrivate = async () => {
    if (railgunAddress) {
      await navigator.clipboard.writeText(railgunAddress);
      setCopiedPrivate(true);
      setTimeout(() => setCopiedPrivate(false), 2000);
    }
  };

  const handlePrivateAction = (action: () => void) => {
    setMobileMenuOpen(false);
    action();
  };

  const closeMenu = () => setMobileMenuOpen(false);

  const navigateTo = (view: MobileMenuView) => {
    if (view === 'main') {
      setSlideDirection('right');
    } else {
      setSlideDirection('left');
    }
    setMenuView(view);
  };

  return (
    <header className="w-full relative z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Logo size={isMobile ? 40 : 48} />
          <div className="relative">
            <span className={`${isMobile ? 'text-base' : 'text-lg'} font-normal text-void-white`}>VoidDex</span>
            {isSepolia && !isMobile && (
              <span className="absolute -top-1 -right-12 text-[10px] text-gray-500 font-medium">testnet</span>
            )}
          </div>
        </Link>

        {/* Desktop Navigation */}
        {!isMobile && (
          <div className="flex items-center gap-2">
            {/* Docs Link */}
            <Link
              href="/docs"
              className="h-10 flex items-center px-3 text-sm text-void-muted hover:text-void-text transition-colors"
            >
              Docs
            </Link>

            {/* Network Selector (only when connected) */}
            {isConnected && <NetworkSelector />}

            {/* Dual Wallet Button (connected) or Connect Button (disconnected) */}
            {isConnected ? (
              <UnifiedProfileButton disabled={!apiHealthy} />
            ) : (
              <ProfileButton disabled={!apiHealthy} />
            )}
          </div>
        )}

        {/* Mobile Menu Button */}
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-void-muted hover:text-void-white transition-colors"
            aria-label="Toggle menu"
          >
            <HiOutlineBars3 className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Mobile Full-Screen Menu */}
      {isMobile && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
              mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={closeMenu}
          />

          {/* Menu Panel */}
          <div
            className={`fixed inset-y-0 right-0 w-full max-w-sm bg-void-dark border-l border-void-border shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
              mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            {/* Menu Header - Fixed */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-void-border bg-void-dark">
              {menuView === 'main' ? (
                <Link href="/" onClick={closeMenu} className="flex items-center gap-2">
                  <Logo size={32} />
                  <span className="text-base font-normal text-void-white">VoidDex</span>
                </Link>
              ) : (
                <button
                  onClick={() => navigateTo('main')}
                  className="flex items-center gap-2 text-void-muted hover:text-void-white transition-colors"
                >
                  <HiArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium text-void-white">
                    {menuView === 'network' ? 'Select Network' : 'Wallets'}
                  </span>
                </button>
              )}
              <button
                onClick={closeMenu}
                className="p-2 -mr-2 text-void-muted hover:text-void-white transition-colors"
              >
                <HiXMark className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {/* Main View */}
              {menuView === 'main' && (
                <div className={`p-4 space-y-2 transition-transform duration-200 ${slideDirection === 'right' ? 'animate-[slideInRight_0.2s_ease-out]' : ''}`}>
                  {/* Docs Link */}
                  <Link
                    href="/docs"
                    onClick={closeMenu}
                    className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-void-gray transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <HiDocumentText className="w-5 h-5 text-void-muted" />
                      <span className="text-sm font-medium text-void-white">Documentation</span>
                    </div>
                  </Link>

                  {/* Network Selector */}
                  {isConnected && (
                    <button
                      onClick={() => navigateTo('network')}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-void-gray transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <HiGlobeAlt className="w-5 h-5 text-void-muted" />
                        <div className="text-left">
                          <div className="text-sm font-medium text-void-white">Network</div>
                          <div className="text-xs text-void-muted">{chain?.name || 'Select'}</div>
                        </div>
                      </div>
                      <HiChevronRight className="w-4 h-4 text-void-muted" />
                    </button>
                  )}

                  {/* Wallet Button */}
                  {isConnected ? (
                    <button
                      onClick={() => navigateTo('wallet')}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-void-gray transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <HiWallet className="w-5 h-5 text-green-400" />
                        <span className="text-sm font-medium text-void-white">Wallets</span>
                      </div>
                      <HiChevronRight className="w-4 h-4 text-void-muted" />
                    </button>
                  ) : (
                    <div className="px-4 py-3">
                      <ProfileButton disabled={!apiHealthy} />
                    </div>
                  )}
                </div>
              )}

              {/* Network View */}
              {menuView === 'network' && (
                <div className="p-4 space-y-2 animate-[slideInLeft_0.2s_ease-out]">
                  {CHAINS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        switchChain?.({ chainId: c.id });
                        closeMenu();
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                        c.id === chainId
                          ? 'bg-void-accent/10'
                          : 'hover:bg-void-gray'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Image
                          src={c.icon}
                          alt={c.name}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                        <div className="text-left">
                          <div className={`text-sm font-medium ${c.id === chainId ? 'text-void-accent' : 'text-void-white'}`}>
                            {c.name}
                          </div>
                          {isTestnet(c) && (
                            <div className="text-xs text-void-muted">Testnet</div>
                          )}
                        </div>
                      </div>
                      {c.id === chainId && <HiCheckCircle className="w-5 h-5 text-void-accent" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Wallet View */}
              {menuView === 'wallet' && (
                <div className="p-4 space-y-4 animate-[slideInLeft_0.2s_ease-out]">
                  {/* Public Wallet Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                      <span className="text-xs font-medium text-void-muted uppercase tracking-wide">Public Wallet</span>
                    </div>
                    <div className="bg-void-gray border border-void-border rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <HiWallet className="w-4 h-4 text-green-400" />
                          <span className="text-sm text-void-white font-mono">{formatAddress(address)}</span>
                        </div>
                        <button
                          onClick={handleCopyPublic}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-void-light transition-colors text-void-muted hover:text-void-white text-xs"
                        >
                          {copiedPublic ? (
                            <>
                              <HiCheck className="w-3.5 h-3.5 text-void-success" />
                              <span className="text-void-success">Copied</span>
                            </>
                          ) : (
                            <>
                              <HiClipboardDocument className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          disconnect();
                          closeMenu();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-void-danger/10 text-void-danger hover:bg-void-danger/20 transition-colors text-sm"
                      >
                        <HiArrowRightOnRectangle className="w-4 h-4" />
                        <span className="font-medium">Disconnect</span>
                      </button>
                    </div>
                  </div>

                  {/* Private Wallet Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-void-accent' : 'bg-void-muted'}`} />
                      <span className="text-xs font-medium text-void-muted uppercase tracking-wide">Private Wallet</span>
                    </div>
                    <div className="bg-void-gray border border-void-border rounded-xl p-3 space-y-2">
                      {!hasWallet ? (
                        <button
                          onClick={() => handlePrivateAction(openOnboarding)}
                          className="w-full flex items-center gap-3 py-3 px-3 bg-void-accent/10 hover:bg-void-accent/20 border border-void-accent/30 rounded-lg transition-colors"
                        >
                          <HiPlus className="w-5 h-5 text-void-accent" />
                          <div className="text-left">
                            <div className="text-sm text-void-white font-medium">Create Private Wallet</div>
                            <div className="text-xs text-void-muted">Powered by Railgun</div>
                          </div>
                        </button>
                      ) : !isReady ? (
                        <button
                          onClick={() => handlePrivateAction(openUnlock)}
                          className="w-full flex items-center gap-3 py-3 px-3 bg-void-light hover:bg-void-border border border-void-border rounded-lg transition-colors"
                        >
                          <HiLockClosed className="w-5 h-5 text-void-accent" />
                          <div className="text-left">
                            <div className="text-sm text-void-white font-medium">Unlock Private Wallet</div>
                            <div className="text-xs text-void-muted">Enter password</div>
                          </div>
                        </button>
                      ) : (
                        <>
                          <div className="flex items-center justify-between pb-2 border-b border-void-border">
                            <div className="flex items-center gap-2">
                              <HiLockOpen className="w-4 h-4 text-void-accent" />
                              <span className="text-sm text-void-white font-mono">{formatAddress(railgunAddress ?? undefined)}</span>
                            </div>
                            <button
                              onClick={handleCopyPrivate}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-void-light transition-colors text-void-muted hover:text-void-white text-xs"
                            >
                              {copiedPrivate ? (
                                <>
                                  <HiCheck className="w-3.5 h-3.5 text-void-success" />
                                  <span className="text-void-success">Copied</span>
                                </>
                              ) : (
                                <>
                                  <HiClipboardDocument className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>

                          {isSyncing && (
                            <div className="flex items-center gap-2 py-2 px-3 bg-void-accent/10 rounded-lg text-void-accent">
                              <div className="w-3 h-3 border-2 border-void-accent border-t-transparent rounded-full animate-spin" />
                              <span className="text-xs">Syncing balances...</span>
                            </div>
                          )}

                          <div className={`space-y-1 ${isSyncing ? 'opacity-50 pointer-events-none' : ''}`}>
                            <button
                              onClick={() => handlePrivateAction(openTransfer)}
                              disabled={isSyncing}
                              className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-void-light transition-colors"
                            >
                              <HiPaperAirplane className="w-4 h-4 text-void-muted" />
                              <span className="text-sm text-void-white">Send Privately</span>
                            </button>

                            <button
                              onClick={() => handlePrivateAction(openReceive)}
                              disabled={isSyncing}
                              className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-void-light transition-colors"
                            >
                              <HiArrowLeft className="w-4 h-4 text-void-muted" />
                              <span className="text-sm text-void-white">Receive Privately</span>
                            </button>

                            <button
                              onClick={() => handlePrivateAction(openShield)}
                              disabled={isSyncing}
                              className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-void-light transition-colors"
                            >
                              <HiShieldCheck className="w-4 h-4 text-void-muted" />
                              <span className="text-sm text-void-white">Shield Tokens</span>
                            </button>

                            <button
                              onClick={() => handlePrivateAction(openUnshield)}
                              disabled={isSyncing}
                              className="w-full flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-void-light transition-colors"
                            >
                              <HiLockOpen className="w-4 h-4 text-void-muted" />
                              <span className="text-sm text-void-white">Unshield Tokens</span>
                            </button>

                            <div className="pt-2 mt-1 border-t border-void-border">
                              <button
                                onClick={async () => {
                                  await lockWallet();
                                  closeMenu();
                                }}
                                disabled={isSyncing}
                                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-void-light text-void-danger hover:bg-void-border transition-colors text-sm"
                              >
                                <HiLockClosed className="w-4 h-4" />
                                <span className="font-medium">Lock Wallet</span>
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}

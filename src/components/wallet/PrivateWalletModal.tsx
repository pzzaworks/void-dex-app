'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import {
  HiCheckBadge,
  HiXMark,
  HiChevronLeft,
  HiChevronDown,
  HiLockClosed,
  HiLockOpen,
  HiPaperAirplane,
  HiArrowDownTray,
  HiCheckCircle,
  HiClipboard,
  HiInformationCircle,
} from 'react-icons/hi2';
import { useRailgun } from '@/providers/RailgunProvider';
import { useShieldedBalances } from '@/hooks/useShieldedBalances';
import { NetworkName, NetworkNameType, SUPPORTED_NETWORKS } from '@/services/railgun';
import { ShieldModal } from './ShieldModal';
import { formatBalanceSmart } from '@/lib/format';

// Network info with icons
const NETWORKS: Record<string, { name: string; icon: string }> = {
  [NetworkName.Ethereum]: { name: 'Ethereum', icon: '/networks/ethereum.svg' },
  [NetworkName.Polygon]: { name: 'Polygon', icon: '/networks/polygon.svg' },
  [NetworkName.Arbitrum]: { name: 'Arbitrum', icon: '/networks/arbitrum-one.svg' },
  [NetworkName.BNBChain]: { name: 'BNB Chain', icon: '/networks/binance-smart-chain.svg' },
  [NetworkName.EthereumSepolia]: { name: 'Sepolia', icon: '/networks/ethereum.svg' },
};

// Tokens with proper icons
const NETWORK_TOKENS: Record<
  string,
  Array<{ address: string; symbol: string; name: string; decimals: number; icon: string }>
> = {
  [NetworkName.Ethereum]: [
    {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      icon: '/tokens/ETH.svg',
    },
    {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      icon: '/tokens/USDC.svg',
    },
    {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      symbol: 'USDT',
      name: 'Tether',
      decimals: 6,
      icon: '/tokens/USDT.svg',
    },
    {
      address: '0x6B175474E89094C44Da98b954EescdeCB5BE3830F',
      symbol: 'DAI',
      name: 'Dai',
      decimals: 18,
      icon: '/tokens/DAI.svg',
    },
  ],
  [NetworkName.Polygon]: [
    {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'MATIC',
      name: 'Polygon',
      decimals: 18,
      icon: '/tokens/MATIC.svg',
    },
    {
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      icon: '/tokens/USDC.svg',
    },
    {
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      symbol: 'USDT',
      name: 'Tether',
      decimals: 6,
      icon: '/tokens/USDT.svg',
    },
  ],
  [NetworkName.Arbitrum]: [
    {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      icon: '/tokens/ETH.svg',
    },
    {
      address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      icon: '/tokens/USDC.svg',
    },
    {
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      symbol: 'USDT',
      name: 'Tether',
      decimals: 6,
      icon: '/tokens/USDT.svg',
    },
  ],
  [NetworkName.BNBChain]: [
    {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'BNB',
      name: 'BNB',
      decimals: 18,
      icon: '/tokens/BNB.svg',
    },
    {
      address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 18,
      icon: '/tokens/USDC.svg',
    },
    {
      address: '0x55d398326f99059fF775485246999027B3197955',
      symbol: 'USDT',
      name: 'Tether',
      decimals: 18,
      icon: '/tokens/USDT.svg',
    },
  ],
  [NetworkName.EthereumSepolia]: [
    {
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      name: 'Sepolia ETH',
      decimals: 18,
      icon: '/tokens/ETH.svg',
    },
    {
      address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      symbol: 'USDC',
      name: 'USD Coin (Test)',
      decimals: 6,
      icon: '/tokens/USDC.svg',
    },
    {
      address: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
      symbol: 'USDT',
      name: 'Tether USD (Test)',
      decimals: 6,
      icon: '/tokens/USDT.svg',
    },
  ],
};

type ModalView = 'main' | 'send' | 'receive';

interface PrivateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivateWalletModal({ isOpen, onClose }: PrivateWalletModalProps) {
  const { railgunAddress } = useRailgun();
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkNameType>(
    NetworkName.EthereumSepolia,
  );
  const { loading: balancesLoading, getBalance } = useShieldedBalances(selectedNetwork);

  const [view, setView] = useState<ModalView>('main');
  const [copied, setCopied] = useState(false);
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false);
  const [showShieldModal, setShowShieldModal] = useState(false);
  const [shieldMode, setShieldMode] = useState<'shield' | 'unshield'>('shield');

  // Check if network is a testnet
  const isTestnet = (networkKey: string) => {
    return (
      networkKey.includes('Sepolia') ||
      networkKey.includes('Amoy') ||
      networkKey.includes('Goerli') ||
      networkKey.includes('Mumbai')
    );
  };

  // Send form state
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendToken, setSendToken] = useState<
    ((typeof NETWORK_TOKENS)[string][0] & { balance: bigint }) | null
  >(null);

  const handleCopy = useCallback(async () => {
    if (railgunAddress) {
      await navigator.clipboard.writeText(railgunAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [railgunAddress]);

  const shortenAddress = (addr: string) => `${addr.slice(0, 10)}...${addr.slice(-8)}`;

  const getTokenBalances = useCallback(() => {
    const tokens = NETWORK_TOKENS[selectedNetwork] || [];
    return tokens.map((token) => ({
      ...token,
      balance: getBalance(selectedNetwork, token.address),
    }));
  }, [selectedNetwork, getBalance]);

  const handleShield = () => {
    setShieldMode('shield');
    setShowShieldModal(true);
  };

  const handleUnshield = () => {
    setShieldMode('unshield');
    setShowShieldModal(true);
  };

  const resetView = () => {
    setView('main');
    setSendRecipient('');
    setSendAmount('');
    setSendToken(null);
  };

  if (!isOpen) return null;

  const tokenBalances = getTokenBalances();
  const currentNetwork = NETWORKS[selectedNetwork];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <div className="relative w-full max-w-md mx-4 max-h-[calc(100vh-2rem)] bg-void-dark border border-void-border rounded-2xl flex flex-col overflow-hidden shadow-2xl">
          {/* Header - Sticky */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-void-border bg-void-dark">
            <div className="flex items-center gap-3">
              {view !== 'main' && (
                <button
                  onClick={resetView}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-void-gray transition-colors text-void-muted hover:text-void-white"
                >
                  <HiChevronLeft className="w-5 h-5" />
                </button>
              )}
              <HiCheckBadge className="w-8 h-8 text-void-success" />
              <div>
                <h2 className="text-lg font-semibold text-void-white">
                  {view === 'main' && 'Private Wallet'}
                  {view === 'send' && 'Private Send'}
                  {view === 'receive' && 'Receive'}
                </h2>
                <p className="text-xs text-void-success">RAILGUN 0zk Address</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-void-gray transition-colors text-void-muted hover:text-void-white"
            >
              <HiXMark className="w-5 h-5" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            {/* Main View */}
            {view === 'main' && (
              <>
                {/* Private Address */}
                <div className="p-6">
                  <div className="p-4 bg-void-success/5 border border-void-success/20 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <HiCheckBadge className="w-4 h-4 text-void-success" />
                        <span className="text-xs font-medium text-void-success">
                          Private 0zk Address
                        </span>
                      </div>
                    </div>
                    {railgunAddress ? (
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm text-void-white">
                          {shortenAddress(railgunAddress)}
                        </span>
                        <button
                          onClick={handleCopy}
                          className="p-2 rounded-lg hover:bg-void-success/20 transition-colors text-void-success"
                        >
                          {copied ? (
                            <HiCheckCircle className="w-4 h-4" />
                          ) : (
                            <HiClipboard className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-void-success/30 border-t-void-success rounded-full animate-spin" />
                        <span className="text-sm text-void-muted">Loading wallet address...</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 pb-4">
                  <div className="grid grid-cols-4 gap-2">
                    <button
                      onClick={handleShield}
                      className="flex flex-col items-center gap-1.5 p-3 bg-void-gray hover:bg-void-light rounded-xl transition-colors group"
                    >
                      <HiLockClosed className="w-6 h-6 text-void-accent" />
                      <span className="text-xs font-medium text-void-text group-hover:text-void-white transition-colors">
                        Shield
                      </span>
                    </button>

                    <button
                      onClick={handleUnshield}
                      className="flex flex-col items-center gap-1.5 p-3 bg-void-gray hover:bg-void-light rounded-xl transition-colors group"
                    >
                      <HiLockOpen className="w-6 h-6 text-void-text" />
                      <span className="text-xs font-medium text-void-text group-hover:text-void-white transition-colors">
                        Unshield
                      </span>
                    </button>

                    <button
                      onClick={() => setView('send')}
                      className="flex flex-col items-center gap-1.5 p-3 bg-void-gray hover:bg-void-light rounded-xl transition-colors group"
                    >
                      <HiPaperAirplane className="w-6 h-6 text-void-text" />
                      <span className="text-xs font-medium text-void-text group-hover:text-void-white transition-colors">
                        Send
                      </span>
                    </button>

                    <button
                      onClick={() => setView('receive')}
                      className="flex flex-col items-center gap-1.5 p-3 bg-void-gray hover:bg-void-light rounded-xl transition-colors group"
                    >
                      <HiArrowDownTray className="w-6 h-6 text-void-text" />
                      <span className="text-xs font-medium text-void-text group-hover:text-void-white transition-colors">
                        Receive
                      </span>
                    </button>
                  </div>
                </div>

                {/* Network Selector */}
                <div className="px-6 pb-4">
                  <div className="relative">
                    <button
                      onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-void-gray rounded-xl hover:bg-void-light transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Image
                          src={currentNetwork.icon}
                          alt={currentNetwork.name}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                        <span className="text-sm font-medium text-void-white">
                          {currentNetwork.name}
                        </span>
                        {isTestnet(selectedNetwork) && (
                          <span className="text-xs text-void-muted bg-void-light px-2 py-0.5 rounded">
                            Testnet
                          </span>
                        )}
                      </div>
                      <HiChevronDown
                        className={`w-4 h-4 text-void-muted transition-transform ${showNetworkDropdown ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {showNetworkDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowNetworkDropdown(false)}
                        />
                        <div className="absolute top-full left-0 right-0 mt-2 bg-void-dark border border-void-border rounded-xl shadow-2xl overflow-hidden z-20">
                          {SUPPORTED_NETWORKS.map((network) => {
                            const netInfo = NETWORKS[network];
                            if (!netInfo) return null;
                            return (
                              <button
                                key={network}
                                onClick={() => {
                                  setSelectedNetwork(network);
                                  setShowNetworkDropdown(false);
                                }}
                                className={`w-full flex items-center gap-2 px-4 py-3 hover:bg-void-gray transition-colors ${
                                  network === selectedNetwork ? 'bg-void-gray' : ''
                                }`}
                              >
                                <Image
                                  src={netInfo.icon}
                                  alt={netInfo.name}
                                  width={24}
                                  height={24}
                                  className="rounded-full"
                                />
                                <span className="text-sm text-void-white">{netInfo.name}</span>
                                {isTestnet(network) && (
                                  <span className="text-xs text-void-muted bg-void-light px-2 py-0.5 rounded">
                                    Testnet
                                  </span>
                                )}
                                {network === selectedNetwork && (
                                  <HiCheckCircle className="w-4 h-4 text-void-accent ml-auto" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Shielded Balances */}
                <div className="px-6 pb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-void-muted">Shielded Balances</span>
                    {balancesLoading && (
                      <div className="w-4 h-4 border-2 border-void-accent/30 border-t-void-accent rounded-full animate-spin" />
                    )}
                  </div>

                  {balancesLoading ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-void-accent border-t-transparent" />
                      <span className="text-sm text-void-muted">Syncing private balances...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tokenBalances.map((token) => (
                        <div
                          key={token.address}
                          className="flex items-center justify-between p-3 bg-void-gray rounded-xl hover:bg-void-light transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Image
                              src={token.icon}
                              alt={token.symbol}
                              width={32}
                              height={32}
                              className="rounded-full"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <div>
                              <div className="font-medium text-void-white text-sm">
                                {token.symbol}
                              </div>
                              <div className="text-xs text-void-muted">{token.name}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-sm text-void-white">
                              {formatBalanceSmart(token.balance, token.decimals)}
                            </div>
                            {token.balance > BigInt(0) && (
                              <div className="text-xs text-void-success flex items-center gap-1 justify-end">
                                <HiCheckCircle className="w-3 h-3" />
                                Private
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Send View */}
            {view === 'send' && (
              <div className="p-6 space-y-4">
                <p className="text-sm text-void-muted">
                  Send tokens privately to another 0zk address. All transaction details are
                  encrypted.
                </p>

                {/* Recipient */}
                <div>
                  <label className="block text-sm text-void-muted mb-2">
                    Recipient 0zk Address
                  </label>
                  <input
                    type="text"
                    value={sendRecipient}
                    onChange={(e) => setSendRecipient(e.target.value)}
                    placeholder="0zk..."
                    className="w-full px-4 py-3 bg-void-gray rounded-xl text-void-white placeholder:text-void-muted focus:outline-none focus:ring-1 focus:ring-void-accent font-mono text-sm"
                  />
                </div>

                {/* Token */}
                <div>
                  <label className="block text-sm text-void-muted mb-2">Token</label>
                  <div className="grid grid-cols-2 gap-2">
                    {tokenBalances
                      .filter((t) => t.balance > BigInt(0))
                      .map((token) => (
                        <button
                          key={token.address}
                          onClick={() => setSendToken(token)}
                          className={`flex items-center gap-2 p-3 rounded-xl transition-colors ${
                            sendToken?.address === token.address
                              ? 'bg-void-accent/10 border border-void-accent'
                              : 'bg-void-gray hover:bg-void-light border border-transparent'
                          }`}
                        >
                          <Image
                            src={token.icon}
                            alt={token.symbol}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                          <div className="text-left">
                            <div className="text-sm font-medium text-void-white">
                              {token.symbol}
                            </div>
                            <div className="text-xs text-void-muted">
                              {formatBalanceSmart(token.balance, token.decimals)}
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                  {tokenBalances.every((t) => t.balance === BigInt(0)) && (
                    <div className="text-center py-4 text-void-muted text-sm">
                      No shielded tokens to send
                    </div>
                  )}
                </div>

                {/* Amount */}
                {sendToken && (
                  <div>
                    <label className="block text-sm text-void-muted mb-2">Amount</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={sendAmount}
                        onChange={(e) => {
                          if (/^\d*\.?\d*$/.test(e.target.value)) {
                            setSendAmount(e.target.value);
                          }
                        }}
                        placeholder="0.0"
                        className="w-full px-4 py-3 bg-void-gray rounded-xl text-void-white placeholder:text-void-muted focus:outline-none focus:ring-1 focus:ring-void-accent font-mono pr-20"
                      />
                      <button
                        onClick={() =>
                          setSendAmount(formatBalanceSmart(sendToken.balance, sendToken.decimals))
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-void-accent hover:bg-void-accent/10 rounded transition-colors"
                      >
                        MAX
                      </button>
                    </div>
                  </div>
                )}

                <button
                  disabled={!sendRecipient || !sendToken || !sendAmount}
                  className={`w-full py-3 rounded-xl font-semibold transition-all ${
                    sendRecipient && sendToken && sendAmount
                      ? 'bg-void-accent hover:bg-void-accent-hover text-void-black'
                      : 'bg-void-gray text-void-muted cursor-not-allowed'
                  }`}
                >
                  Send Privately
                </button>

                <div className="p-3 bg-void-success/5 border border-void-success/10 rounded-xl">
                  <div className="flex items-start gap-2">
                    <HiInformationCircle className="w-4 h-4 text-void-success shrink-0 mt-0.5" />
                    <span className="text-xs text-void-success">
                      All details (sender, recipient, amount, token) are hidden from public view
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Receive View */}
            {view === 'receive' && (
              <div className="p-6 space-y-4">
                <p className="text-sm text-void-muted text-center">
                  Share your 0zk address to receive private transfers
                </p>

                {railgunAddress ? (
                  <>
                    {/* QR Code */}
                    <div className="flex justify-center py-4">
                      <div className="bg-white rounded-2xl p-4">
                        <QRCodeSVG
                          value={railgunAddress}
                          size={180}
                          level="H"
                          includeMargin={false}
                          bgColor="#FFFFFF"
                          fgColor="#000000"
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div className="p-4 bg-void-gray rounded-xl">
                      <div className="text-xs text-void-muted mb-2 text-center">
                        Your Private 0zk Address
                      </div>
                      <div className="font-mono text-xs text-void-white break-all text-center leading-relaxed">
                        {railgunAddress}
                      </div>
                    </div>

                    <button
                      onClick={handleCopy}
                      className="w-full py-3 bg-void-accent hover:bg-void-accent-hover text-void-black font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {copied ? (
                        <>
                          <HiCheckCircle className="w-5 h-5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <HiClipboard className="w-5 h-5" />
                          Copy Address
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 border-4 border-void-accent/30 border-t-void-accent rounded-full animate-spin" />
                    <p className="text-sm text-void-muted">Loading your private address...</p>
                  </div>
                )}

                <div className="p-3 bg-void-success/5 border border-void-success/10 rounded-xl">
                  <div className="flex items-start gap-2">
                    <HiInformationCircle className="w-4 h-4 text-void-success shrink-0 mt-0.5" />
                    <span className="text-xs text-void-success">
                      Your 0zk address never appears on the blockchain. Only you can see received
                      tokens.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shield Modal */}
      <ShieldModal
        isOpen={showShieldModal}
        onClose={() => setShowShieldModal(false)}
        initialMode={shieldMode}
      />
    </>
  );
}

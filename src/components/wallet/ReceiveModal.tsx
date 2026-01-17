'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { HiXMark, HiCheckCircle, HiClipboard, HiInformationCircle } from 'react-icons/hi2';
import { useRailgun } from '@/providers/RailgunProvider';

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiveModal({ isOpen, onClose }: ReceiveModalProps) {
  const { railgunAddress } = useRailgun();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (railgunAddress) {
      await navigator.clipboard.writeText(railgunAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md max-h-[calc(100vh-2rem)] bg-void-dark border border-void-border rounded-2xl flex flex-col overflow-hidden">
        {/* Header - Sticky */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-void-border bg-void-dark">
          <h2 className="text-lg font-semibold text-void-white">Receive Privately</h2>
          <button
            onClick={onClose}
            className="text-void-muted hover:text-void-white transition-colors"
          >
            <HiXMark className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Description */}
            <p className="text-sm text-void-muted">
              Share your private Railgun address to receive tokens with full privacy.
            </p>

            {/* QR Code */}
            <div className="flex items-center justify-center p-8 bg-white rounded-xl">
              {railgunAddress && (
                <QRCodeSVG
                  value={railgunAddress}
                  size={192}
                  level="H"
                  includeMargin={false}
                  fgColor="#000000"
                  bgColor="#ffffff"
                  imageSettings={{
                    src: '/void-dex-logo-dark.svg',
                    x: undefined,
                    y: undefined,
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              )}
            </div>

            {/* Address Display */}
            <div>
              <label className="block text-sm text-void-muted mb-1.5">Your Railgun Address</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 bg-void-gray rounded-xl text-void-white font-mono text-sm break-all">
                  {railgunAddress}
                </div>
                <button
                  onClick={handleCopy}
                  className="px-4 py-3 bg-void-accent hover:bg-void-accent-hover text-void-black rounded-xl transition-colors shrink-0"
                >
                  {copied ? (
                    <HiCheckCircle className="w-5 h-5" />
                  ) : (
                    <HiClipboard className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-void-gray/50 rounded-xl">
              <div className="flex items-start gap-3">
                <HiInformationCircle className="w-5 h-5 text-void-accent shrink-0 mt-0.5" />
                <div className="text-sm text-void-muted">
                  <strong className="text-void-white">Private receiving:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Tokens sent to this address are fully private</li>
                    <li>Sender needs Railgun support for full privacy</li>
                    <li>Your balance and transactions remain hidden</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-semibold bg-void-gray text-void-white hover:bg-void-light transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

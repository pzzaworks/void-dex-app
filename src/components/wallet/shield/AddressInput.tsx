'use client';

interface AddressInputProps {
  mode: 'shield' | 'unshield';
  publicAddress: string;
  onAddressChange: (value: string) => void;
}

export function AddressInput({ mode, publicAddress, onAddressChange }: AddressInputProps) {
  // Shield mode: No address input needed (uses connected wallet automatically)
  if (mode === 'shield') {
    return null;
  }

  // Unshield mode: Optional destination address
  return (
    <div>
      <label className="block text-sm text-void-muted mb-1.5">Destination Address (optional)</label>
      <input
        type="text"
        value={publicAddress}
        onChange={(e) => onAddressChange(e.target.value)}
        placeholder="0x..."
        className="w-full px-4 py-3 bg-void-gray rounded-xl text-void-white placeholder:text-void-muted focus:outline-none focus:ring-1 focus:ring-void-accent font-mono text-sm"
      />
    </div>
  );
}

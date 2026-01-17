'use client';

export function CreatingStep() {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="w-16 h-16 mx-auto border-4 border-void-accent/30 border-t-void-accent rounded-full animate-spin" />
      <div>
        <h3 className="text-lg font-semibold text-void-white mb-1">Creating Your Wallet</h3>
        <p className="text-sm text-void-muted">This may take a moment...</p>
      </div>
    </div>
  );
}

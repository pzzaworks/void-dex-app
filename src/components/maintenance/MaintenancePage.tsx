import { HiCog6Tooth } from 'react-icons/hi2';

export function MaintenancePage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        {/* Icon */}
        <div className="flex justify-center">
          <HiCog6Tooth className="w-10 h-10 text-void-accent" />
        </div>

        {/* Title */}
        <div>
          <h1 className="text-xl font-semibold text-void-white mb-1">Under Maintenance</h1>
          <p className="text-sm text-void-muted">
            We're making improvements to serve you better.
          </p>
          <p className="text-xs text-void-muted mt-1">Please check back in a few moments</p>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useCleanupActions } from "../stores/appStore";

export default function DataCleanup() {
  const [showConfirm, setShowConfirm] = useState(false);
  const { clearAllData, clearEvents, clearCaptures } = useCleanupActions();

  const handleClearAll = () => {
    clearAllData();
    setShowConfirm(false);
  };

  const handleClearEvents = () => {
    clearEvents();
  };

  const handleClearCaptures = () => {
    clearCaptures();
  };

  return (
    <div className="glass flat p-4">
      <h3 className="text-lg font-semibold mb-4 text-red-400">
        Data Management
      </h3>

      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            onClick={handleClearEvents}
            className="px-3 py-2 text-sm btn-secondary hover:bg-red-500/20 hover:text-red-300 transition-colors"
          >
            Clear Events
          </button>
          <button
            onClick={handleClearCaptures}
            className="px-3 py-2 text-sm btn-secondary hover:bg-red-500/20 hover:text-red-300 transition-colors"
          >
            Clear Captures
          </button>

          <button
            onClick={() => setShowConfirm(true)}
            className="px-4 py-2 text-sm btn-primary bg-red-600 hover:bg-red-700 transition-colors"
          >
            Clear All Data
          </button>
        </div>

        {/* <div className="border-t border-white/10 pt-3">
          <button
            onClick={() => setShowConfirm(true)}
            className="px-4 py-2 text-sm btn-primary bg-red-600 hover:bg-red-700 transition-colors"
          >
            Clear All Data
          </button>
        </div> */}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass flat p-6 max-w-md mx-4">
            <h4 className="text-lg font-semibold mb-4 text-red-400">
              Confirm Data Deletion
            </h4>
            <p className="text-sm text-gray-300 mb-6">
              This will permanently delete all events and captures. Memory data
              is persistent and will not be affected. This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
              >
                Yes, Delete All
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sm btn-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

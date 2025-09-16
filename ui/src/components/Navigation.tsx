import { Link, useLocation } from "react-router-dom";
import { useAppStore } from "../stores/appStore";
import { Camera, Map, Brain, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import CommandPalette from "./CommandPalette";
import { ConfirmationModal } from "./Modal";
import { useConfirmationModal } from "../hooks/useModal";

export default function Navigation() {
  const location = useLocation();
  const clearAllData = useAppStore((state) => state.clearAllData);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Clear data confirmation modal
  const clearDataConfirmation = useConfirmationModal({
    onConfirm: async () => {
      try {
        await clearAllData();
      } catch (error) {
        console.error("Error during clear all data:", error);
        throw error; // Re-throw to let the modal handle the error
      }
    },
    title: "Clear All Data",
    message:
      "Are you sure you want to clear all data? This action cannot be undone and will remove all memories, thoughts, and waypoints.",
    confirmText: "Clear All Data",
    cancelText: "Cancel",
    type: "danger",
    isLoading: false, // Will be set to true during the action
  });

  const pages = [
    { id: "exploration", label: "Live Exploration", icon: Camera, path: "/" },
    {
      id: "latent-space",
      label: "Latent Space",
      icon: Map,
      path: "/latent-space",
    },
    { id: "memory", label: "Memory Lab", icon: Brain, path: "/memory" },
  ] as const;

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const handleClearAllData = () => {
    clearDataConfirmation.confirm();
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      if (e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    }
  };

  // Add keyboard listener
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <div className="flex gap-2 justify-between items-center">
        <div className="flex gap-2">
          {pages.map((page) => (
            <Link
              key={page.id}
              to={page.path}
              className={`flex px-4 py-2 text-sm flat hover-glow hover-scale transition-all relative ${
                isActive(page.path) ? "btn-primary nav-active" : "btn-secondary"
              }`}
            >
              <page.icon className="w-4 h-4 mr-2" />
              {page.label}
            </Link>
          ))}
        </div>

        <div className="flex gap-2">
          {/* <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex px-3 py-2 text-sm btn-secondary flat hover-glow hover-scale transition-all"
            title="Open command palette (⌘K)"
          >
            <Command className="w-4 h-4 mr-2" />
            <kbd className="text-xs">⌘K</kbd>
          </button> */}

          <button
            onClick={handleClearAllData}
            className="flex px-4 py-2 text-sm flat btn-danger hover-glow hover-scale transition-all"
            title="Clear all data and start fresh"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Data
          </button>
        </div>
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Clear Data Confirmation Modal */}
      <ConfirmationModal
        isOpen={clearDataConfirmation.isOpen}
        onClose={clearDataConfirmation.close}
        onConfirm={clearDataConfirmation.onConfirm}
        title={clearDataConfirmation.confirmationProps.title}
        message={clearDataConfirmation.confirmationProps.message}
        confirmText={clearDataConfirmation.confirmationProps.confirmText}
        cancelText={clearDataConfirmation.confirmationProps.cancelText}
        type={clearDataConfirmation.confirmationProps.type}
        isLoading={clearDataConfirmation.confirmationProps.isLoading}
      />
    </>
  );
}

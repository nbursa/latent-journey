import { Link, useLocation } from "react-router-dom";
import { useAppStore } from "../stores/appStore";
import { Camera, Map, Brain, Trash2 } from "lucide-react";

export default function Navigation() {
  const location = useLocation();
  const clearAllData = useAppStore((state) => state.clearAllData);

  const pages = [
    { id: "exploration", label: "Live Exploration", icon: Camera, path: "/" },
    {
      id: "latent-space",
      label: "Latent Space",
      icon: Map,
      path: "/latent-space",
    },
    { id: "memory", label: "Memory & Analysis", icon: Brain, path: "/memory" },
  ] as const;

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const handleClearAllData = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all data? This action cannot be undone."
      )
    ) {
      clearAllData();
    }
  };

  return (
    <div className="flex gap-2 justify-between items-center">
      <div className="flex gap-2">
        {pages.map((page) => (
          <Link
            key={page.id}
            to={page.path}
            className={`flex px-4 py-2 text-sm flat hover-glow hover-scale transition-all ${
              isActive(page.path) ? "btn-primary" : "btn-secondary"
            }`}
          >
            <page.icon className="w-4 h-4 mr-2" />
            {page.label}
          </Link>
        ))}
      </div>

      {/* <div className="border-l border-white/20 h-8 mx-2"> */}
      <button
        onClick={handleClearAllData}
        className="flex px-4 py-2 text-sm btn-danger flat hover-glow hover-scale transition-all"
        title="Clear all data and start fresh"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Clear All Data
      </button>
      {/* </div> */}
    </div>
  );
}

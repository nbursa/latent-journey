import { useState } from "react";
import {
  Eye,
  EyeOff,
  Filter,
  RotateCcw,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface VisualizationControlsProps {
  onFilterChange: (filter: "all" | "vision" | "speech" | "stm" | "ltm") => void;
  onCameraPresetChange: (preset: "top" | "isometric" | "free") => void;
  onToggleTrajectory: () => void;
  onResetView: () => void;
  onFitAll: () => void;
  showTrajectory: boolean;
  currentFilter: "all" | "vision" | "speech" | "stm" | "ltm";
  currentPreset: "top" | "isometric" | "free";
  pointCount: number;
  className?: string;
}

export default function VisualizationControls({
  onFilterChange,
  onCameraPresetChange,
  onToggleTrajectory,
  onResetView,
  onFitAll,
  showTrajectory,
  currentFilter,
  currentPreset,
  pointCount,
  className = "",
}: VisualizationControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`absolute top-4 left-4 z-20 ${className}`}>
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
        }}
        className="flex items-center gap-2 glass flat p-2 rounded-lg hover:bg-ui-accent/10 transition-colors"
        title="Visualization Controls"
      >
        <Filter className="w-4 h-4" />
        <h3 className="text-sm font-medium">Controls</h3>
      </button>

      {isExpanded && (
        <div className="glass flat p-4 rounded-lg mt-2 min-w-64 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsExpanded(false)}
              className="text-ui-dim hover:text-ui-text transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          <div className="text-xs text-ui-dim">
            <div>Points: {pointCount}</div>
            <div>Trajectory: {showTrajectory ? "On" : "Off"}</div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-ui-text">
              Filter by Source
            </label>
            <div className="flex gap-1 flex-wrap">
              {["all", "vision", "speech", "stm", "ltm"].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    onFilterChange(type as any);
                  }}
                  className={`px-2 py-1 text-xs transition-colors ${
                    currentFilter === type
                      ? "btn-primary nav-active"
                      : "btn-primary"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-ui-text">
              Camera Preset
            </label>
            <div className="flex gap-1 flex-wrap">
              {["top", "isometric", "free"].map((preset) => (
                <button
                  key={preset}
                  onClick={() => onCameraPresetChange(preset as any)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    currentPreset === preset
                      ? "btn-primary nav-active"
                      : "btn-primary"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-ui-text">Display</label>
            <div className="flex gap-2">
              <button
                onClick={onToggleTrajectory}
                className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                  showTrajectory ? "btn-primary nav-active" : "btn-primary"
                }`}
              >
                {showTrajectory ? (
                  <Eye className="w-3 h-3" />
                ) : (
                  <EyeOff className="w-3 h-3" />
                )}
                Trajectory
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-ui-text">View</label>
            <div className="flex gap-2">
              <button
                onClick={onResetView}
                className="px-2 py-1 text-xs rounded transition-colors btn-secondary flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
              <button
                onClick={onFitAll}
                className="px-2 py-1 text-xs rounded transition-colors btn-secondary flex items-center gap-1"
              >
                <Maximize2 className="w-3 h-3" />
                Fit All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

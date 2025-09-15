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
  onFilterChange: (filter: "all" | "vision" | "speech") => void;
  onCameraPresetChange: (preset: "top" | "isometric" | "free") => void;
  onToggleTrajectory: () => void;
  onResetView: () => void;
  onFitAll: () => void;
  showTrajectory: boolean;
  currentFilter: "all" | "vision" | "speech";
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
      {/* Main control button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="glass flat p-2 rounded-lg hover:bg-ui-accent/10 transition-colors"
        title="Visualization Controls"
      >
        <Filter className="w-4 h-4" />
      </button>

      {/* Expanded controls panel */}
      {isExpanded && (
        <div className="glass flat p-4 rounded-lg mt-2 min-w-64 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-ui-accent">Controls</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-ui-dim hover:text-ui-text transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Data info */}
          <div className="text-xs text-ui-dim">
            <div>Points: {pointCount}</div>
            <div>Trajectory: {showTrajectory ? "On" : "Off"}</div>
          </div>

          {/* Filter controls */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-ui-text">
              Filter by Source
            </label>
            <div className="flex gap-1 flex-wrap">
              {["all", "vision", "speech"].map((type) => (
                <button
                  key={type}
                  onClick={() => onFilterChange(type as any)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    currentFilter === type
                      ? "bg-ui-accent text-ui-bg"
                      : "bg-ui-surface hover:bg-ui-surface-2 text-ui-text"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Camera presets (for 3D views) */}
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
                      ? "bg-ui-accent text-ui-bg"
                      : "bg-ui-surface hover:bg-ui-surface-2 text-ui-text"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Display options */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-ui-text">Display</label>
            <div className="flex gap-2">
              <button
                onClick={onToggleTrajectory}
                className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                  showTrajectory
                    ? "bg-ui-accent text-ui-bg"
                    : "bg-ui-surface hover:bg-ui-surface-2 text-ui-text"
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

          {/* View controls */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-ui-text">View</label>
            <div className="flex gap-2">
              <button
                onClick={onResetView}
                className="px-2 py-1 text-xs rounded transition-colors bg-ui-surface hover:bg-ui-surface-2 text-ui-text flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
              <button
                onClick={onFitAll}
                className="px-2 py-1 text-xs rounded transition-colors bg-ui-surface hover:bg-ui-surface-2 text-ui-text flex items-center gap-1"
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

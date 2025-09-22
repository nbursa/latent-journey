import {
  Brain,
  RefreshCw,
  PlayCircle,
  BarChart3,
  Download,
  Activity,
} from "lucide-react";

interface ExperimentHeaderProps {
  isLoading: boolean;
  isRunning: boolean;
  onRefresh: () => void;
  onRunAll: () => void;
  selectedView: "summary" | "results" | "status";
  onViewChange: (view: "summary" | "results" | "status") => void;
}

export default function ExperimentHeader({
  isLoading,
  isRunning,
  onRefresh,
  onRunAll,
  selectedView,
  onViewChange,
}: ExperimentHeaderProps) {
  const viewTabs = [
    { id: "summary", label: "Summary", icon: BarChart3 },
    { id: "results", label: "Results", icon: Download },
    { id: "status", label: "Status", icon: Activity },
  ] as const;

  return (
    <div className="flex-shrink-0 p-4 border-b border-ui-border">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ui-text flex items-center gap-2">
            <Brain className="w-6 h-6 text-ui-accent" />
            AI Experiments
          </h1>
          <p className="text-ui-dim">
            Consciousness & Memory Research Platform
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="btn-secondary flex items-center gap-2 p-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>

          <button
            onClick={onRunAll}
            disabled={isRunning}
            className="btn-primary flex items-center gap-2 p-2"
          >
            <PlayCircle className="w-4 h-4" />
            Run All
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 mt-4">
        {viewTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onViewChange(id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${
              selectedView === id ? "btn-primary nav-active" : "btn-primary"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

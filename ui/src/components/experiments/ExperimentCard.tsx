import { Play, BarChart3 } from "lucide-react";
import { ExperimentDefinition } from "../../types/experiments";
import {
  ExperimentResult,
  ExperimentSummary,
} from "../../services/experimentsService";
import {
  getStatusIcon,
  getStatusColor,
  formatValue,
} from "../../utils/experimentUtils";

interface ExperimentCardProps {
  experiment: ExperimentDefinition;
  expData?: ExperimentSummary["experiments"][0];
  result?: ExperimentResult;
  isRunning: boolean;
  onRun: (experimentId: string) => void;
  onViewResults: () => void;
}

export default function ExperimentCard({
  experiment,
  expData,
  result,
  isRunning,
  onRun,
  onViewResults,
}: ExperimentCardProps) {
  const Icon = experiment.icon;

  return (
    <div className={`glass p-4 ${experiment.borderColor} border`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${experiment.bgColor}`}>
            <Icon className={`w-5 h-5 ${experiment.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-ui-text">{experiment.name}</h3>
            <p className="text-sm text-ui-dim">{experiment.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {getStatusIcon(expData?.status || "not_run")}
          <span
            className={`text-sm ${getStatusColor(
              expData?.status || "not_run"
            )}`}
          >
            {expData?.status || "not_run"}
          </span>
        </div>
      </div>

      {/* Metrics */}
      {result?.metrics && (
        <div className="space-y-2 mb-4">
          <h4 className="text-sm font-medium text-ui-text">Key Metrics:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(result.metrics).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-ui-dim">{key.replace(/_/g, " ")}</span>
                <span className="text-ui-accent font-mono">
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onRun(experiment.id)}
          disabled={isRunning}
          className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
        >
          <Play className="w-4 h-4" />
          Run
        </button>

        {result && (
          <button
            onClick={onViewResults}
            className="btn-primary flex items-center gap-2 text-sm p-2"
          >
            <BarChart3 className="w-4 h-4" />
            View
          </button>
        )}
      </div>
    </div>
  );
}

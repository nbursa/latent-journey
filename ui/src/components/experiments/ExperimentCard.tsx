import {
  Play,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
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

  const getStatisticalSignificance = (pValue?: number) => {
    if (!pValue) return null;
    if (pValue < 0.001) return { level: "***", color: "text-green-400" };
    if (pValue < 0.01) return { level: "**", color: "text-green-400" };
    if (pValue < 0.05) return { level: "*", color: "text-yellow-400" };
    return { level: "ns", color: "text-red-400" };
  };

  const getEffectSizeInterpretation = (effectSize?: number) => {
    if (!effectSize) return null;
    const abs = Math.abs(effectSize);
    if (abs >= 0.8) return "Large";
    if (abs >= 0.5) return "Medium";
    if (abs >= 0.2) return "Small";
    return "Negligible";
  };

  const getKeyMetrics = (metrics: any) => {
    // Show most important metrics first
    const priorityKeys = [
      "smd_gap",
      "entropy_gap",
      "coherence_drop",
      "trauma_score_gap",
      "hallucination_rate",
      "toxic_count",
      "p_value",
      "effect_size",
    ];

    const priorityMetrics = priorityKeys
      .filter((key) => metrics[key] !== null && metrics[key] !== undefined)
      .slice(0, 4); // Show top 4 priority metrics

    return priorityMetrics.map((key) => ({ key, value: metrics[key] }));
  };

  const sig = result?.metrics
    ? getStatisticalSignificance(result.metrics.p_value)
    : null;
  const effectSize = result?.metrics
    ? getEffectSizeInterpretation(result.metrics.effect_size)
    : null;
  const keyMetrics = result?.metrics ? getKeyMetrics(result.metrics) : [];

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

      {/* Success Status */}
      {result && (
        <div className="mb-4 p-2 bg-ui-surface rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span
                className={`text-sm font-medium ${
                  result.success ? "text-green-400" : "text-red-400"
                }`}
              >
                {result.success ? "Success" : "Failed"}
              </span>
            </div>
            <div className="text-xs text-ui-dim">{result.duration_ms}ms</div>
          </div>
        </div>
      )}

      {/* Statistical Significance */}
      {(sig || effectSize) && (
        <div className="mb-4 p-2 bg-ui-surface rounded-lg">
          <div className="flex items-center gap-4 text-xs">
            {sig && (
              <div className="flex items-center gap-1">
                <span className="text-ui-dim">Sig:</span>
                <span className={`font-mono ${sig.color}`}>{sig.level}</span>
              </div>
            )}
            {effectSize && (
              <div className="flex items-center gap-1">
                <span className="text-ui-dim">Effect:</span>
                <span className="text-ui-accent">{effectSize}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {keyMetrics.length > 0 && (
        <div className="space-y-2 mb-4">
          <h4 className="text-sm font-medium text-ui-text">Key Metrics:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {keyMetrics.map(({ key, value }) => (
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

      {/* Special Indicators */}
      {result?.raw_data && (
        <div className="mb-4 flex flex-wrap gap-2">
          {result.experiment_id === "EXP-05" &&
            result.raw_data.windowed_analysis && (
              <div className="flex items-center gap-1 text-xs text-ui-accent bg-ui-surface px-2 py-1 rounded">
                <TrendingUp className="w-3 h-3" />
                Windowed Analysis
              </div>
            )}
          {result.experiment_id === "EXP-08" &&
            result.raw_data.mode_results && (
              <div className="flex items-center gap-1 text-xs text-ui-accent bg-ui-surface px-2 py-1 rounded">
                <AlertTriangle className="w-3 h-3" />
                Superego Modes
              </div>
            )}
          {result.raw_data.manipulation_check && (
            <div className="flex items-center gap-1 text-xs text-ui-accent bg-ui-surface px-2 py-1 rounded">
              <CheckCircle className="w-3 h-3" />
              Manipulation Check
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onRun(experiment.id)}
          disabled={isRunning}
          className={`btn-secondary flex items-center justify-center gap-2 text-sm px-4 py-2 w-fit ${
            isRunning ? "opacity-75 cursor-not-allowed" : ""
          }`}
        >
          {isRunning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {isRunning ? "Running..." : "Run"}
        </button>

        {result && (
          <button
            onClick={onViewResults}
            disabled={isRunning}
            className={`btn-primary flex items-center gap-2 text-sm px-4 py-2 ${
              isRunning ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            View
          </button>
        )}
      </div>
    </div>
  );
}

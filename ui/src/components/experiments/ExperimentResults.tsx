import {
  BarChart3,
  CheckCircle,
  XCircle,
  Brain,
  TrendingUp,
  Activity,
  Info,
} from "lucide-react";
import {
  ExperimentResult,
  WindowedAnalysis,
  SuperegoModeResult,
} from "../../services/experimentsService";
import { EXPERIMENT_DEFINITIONS } from "../../types/experiments";
import { formatValue } from "../../utils/experimentUtils";
import { useState } from "react";
import TrendChart from "./TrendChart";

interface ExperimentResultsProps {
  results: ExperimentResult[];
}

export default function ExperimentResults({ results }: ExperimentResultsProps) {
  const [expandedResult, setExpandedResult] = useState<string | null>(null);

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-12 h-12 text-ui-dim mx-auto mb-4" />
        <p className="text-ui-dim">No experiment results available</p>
        <p className="text-sm text-ui-dim">
          Run some experiments to see results here
        </p>
      </div>
    );
  }

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

  const renderWindowedAnalysis = (rawData: any) => {
    const windowed = rawData?.windowed_analysis as WindowedAnalysis;
    if (!windowed) return null;

    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-ui-text flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Windowed Analysis
        </h4>

        {/* Trend Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TrendChart
            data={windowed.simple_windowed_entropy}
            title="Simple Entropy Trend"
            trend={windowed.simple_trend}
            confidenceInterval={windowed.simple_trend_ci}
          />
          <TrendChart
            data={windowed.complex_windowed_entropy}
            title="Complex Entropy Trend"
            trend={windowed.complex_trend}
            confidenceInterval={windowed.complex_trend_ci}
          />
        </div>

        {/* Statistical Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-ui-surface p-3 rounded-lg">
            <div className="text-sm text-ui-dim mb-1">Simple Trend</div>
            <div className="text-lg font-mono text-ui-accent">
              {windowed.simple_trend.toFixed(4)}
            </div>
            <div className="text-xs text-ui-dim">
              CI: [{windowed.simple_trend_ci[0].toFixed(4)},{" "}
              {windowed.simple_trend_ci[1].toFixed(4)}]
            </div>
          </div>
          <div className="bg-ui-surface p-3 rounded-lg">
            <div className="text-sm text-ui-dim mb-1">Complex Trend</div>
            <div className="text-lg font-mono text-ui-accent">
              {windowed.complex_trend.toFixed(4)}
            </div>
            <div className="text-xs text-ui-dim">
              CI: [{windowed.complex_trend_ci[0].toFixed(4)},{" "}
              {windowed.complex_trend_ci[1].toFixed(4)}]
            </div>
          </div>
        </div>

        {/* Mann-Kendall Tests */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-ui-surface p-3 rounded-lg">
            <div className="text-sm text-ui-dim mb-1">
              Mann-Kendall (Simple)
            </div>
            <div className="text-sm font-mono text-ui-accent">
              S={windowed.simple_mann_kendall.s.toFixed(2)}, p=
              {windowed.simple_mann_kendall.p.toFixed(4)}
            </div>
          </div>
          <div className="bg-ui-surface p-3 rounded-lg">
            <div className="text-sm text-ui-dim mb-1">
              Mann-Kendall (Complex)
            </div>
            <div className="text-sm font-mono text-ui-accent">
              S={windowed.complex_mann_kendall.s.toFixed(2)}, p=
              {windowed.complex_mann_kendall.p.toFixed(4)}
            </div>
          </div>
        </div>

        <div className="text-xs text-ui-dim">
          Window: {windowed.window_size} size, {windowed.window_stride} stride
        </div>
      </div>
    );
  };

  const renderSuperegoAnalysis = (rawData: any) => {
    const modeResults = rawData?.mode_results as SuperegoModeResult[];
    if (!modeResults) return null;

    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-ui-text flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Superego Mode Analysis
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modeResults.map((mode) => (
            <div key={mode.mode} className="bg-ui-surface p-3 rounded-lg">
              <div className="text-sm font-semibold text-ui-text mb-2 capitalize">
                {mode.mode} Mode
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-ui-dim">Utility:</span>
                  <span className="text-ui-accent">
                    {mode.utility_score.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ui-dim">Coverage:</span>
                  <span className="text-ui-accent">
                    {mode.coverage_score.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ui-dim">Toxic Count:</span>
                  <span className="text-ui-accent">{mode.toxic_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ui-dim">Filtered:</span>
                  <span className="text-ui-accent">
                    {(mode.filtered_ratio * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {results.map((result) => {
        const expDef = EXPERIMENT_DEFINITIONS.find(
          (e) => e.id === result.experiment_id
        );
        const Icon = expDef?.icon || Brain;
        const isExpanded = expandedResult === result.experiment_id;
        const sig = getStatisticalSignificance(result.metrics.p_value);
        const effectSize = getEffectSizeInterpretation(
          result.metrics.effect_size
        );

        return (
          <div key={result.experiment_id} className="glass p-4">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    expDef?.bgColor || "bg-gray-500/10"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${expDef?.color || "text-gray-400"}`}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-ui-text">
                    {expDef?.name || result.experiment_id}
                  </h3>
                  <p className="text-sm text-ui-dim">
                    {new Date(result.timestamp).toLocaleString()} •{" "}
                    {result.duration_ms}ms
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span
                  className={`text-sm ${
                    result.success ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {result.success ? "Success" : "Failed"}
                </span>
              </div>
            </div>

            {/* Statistical Significance */}
            {(sig || effectSize) && (
              <div className="mb-4 p-3 bg-ui-surface rounded-lg">
                <div className="flex items-center gap-4 text-sm">
                  {sig && (
                    <div className="flex items-center gap-2">
                      <span className="text-ui-dim">Significance:</span>
                      <span className={`font-mono ${sig.color}`}>
                        {sig.level}
                      </span>
                      <span className="text-ui-dim">
                        (p={result.metrics.p_value?.toFixed(4)})
                      </span>
                    </div>
                  )}
                  {effectSize && (
                    <div className="flex items-center gap-2">
                      <span className="text-ui-dim">Effect Size:</span>
                      <span className="text-ui-accent">
                        {effectSize} (d={result.metrics.effect_size?.toFixed(3)}
                        )
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
              {Object.entries(result.metrics)
                .filter(([, value]) => value !== null && value !== undefined)
                .slice(0, 8) // Show first 8 metrics
                .map(([metricKey, value]) => (
                  <div
                    key={metricKey}
                    className="text-center p-3 bg-ui-surface rounded-lg"
                  >
                    <div className="text-xs text-ui-dim mb-1">
                      {metricKey.replace(/_/g, " ")}
                    </div>
                    <div className="text-lg font-mono text-ui-accent">
                      {formatValue(value)}
                    </div>
                  </div>
                ))}
            </div>

            {/* Expandable Detailed Analysis */}
            <div className="border-t border-ui-border pt-4">
              <button
                onClick={() =>
                  setExpandedResult(isExpanded ? null : result.experiment_id)
                }
                className="flex items-center gap-2 text-sm text-ui-accent hover:text-ui-text transition-colors"
              >
                <Info className="w-4 h-4" />
                {isExpanded ? "Hide" : "Show"} Detailed Analysis
              </button>

              {isExpanded && (
                <div className="mt-4 space-y-4">
                  {/* All Metrics */}
                  <div>
                    <h4 className="font-semibold text-ui-text mb-2">
                      All Metrics
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {Object.entries(result.metrics).map(
                        ([metricKey, value]) => (
                          <div
                            key={metricKey}
                            className="flex justify-between text-xs p-2 bg-ui-surface rounded"
                          >
                            <span className="text-ui-dim">
                              {metricKey.replace(/_/g, " ")}
                            </span>
                            <span className="text-ui-accent font-mono">
                              {formatValue(value)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Specialized Analysis */}
                  {result.experiment_id === "EXP-05" &&
                    renderWindowedAnalysis(result.raw_data)}
                  {result.experiment_id === "EXP-08" &&
                    renderSuperegoAnalysis(result.raw_data)}

                  {/* Raw Data Preview */}
                  <div>
                    <h4 className="font-semibold text-ui-text mb-2">
                      Raw Data
                    </h4>
                    <pre className="text-xs text-ui-dim bg-ui-surface p-3 rounded overflow-x-auto">
                      {JSON.stringify(result.raw_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

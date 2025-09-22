import { BarChart3, CheckCircle, XCircle, Brain } from "lucide-react";
import { ExperimentResult } from "../../services/experimentsService";
import { EXPERIMENT_DEFINITIONS } from "../../types/experiments";
import { formatValue } from "../../utils/experimentUtils";

interface ExperimentResultsProps {
  results: ExperimentResult[];
}

export default function ExperimentResults({ results }: ExperimentResultsProps) {
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

  return (
    <div className="space-y-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {results.map((result) => {
        const expDef = EXPERIMENT_DEFINITIONS.find(
          (e) => e.id === result.experiment_id
        );
        const Icon = expDef?.icon || Brain;

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

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(result.metrics).map(([key, value]) => (
                <div
                  key={key}
                  className="text-center p-3 bg-ui-surface rounded-lg"
                >
                  <div className="text-xs text-ui-dim mb-1">
                    {key.replace(/_/g, " ")}
                  </div>
                  <div className="text-lg font-mono text-ui-accent">
                    {formatValue(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

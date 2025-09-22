import { ExperimentSummary as ExperimentSummaryType, ExperimentResult } from "../../services/experimentsService";
import { EXPERIMENT_DEFINITIONS } from "../../types/experiments";
import ExperimentCard from "./ExperimentCard";

interface ExperimentSummaryProps {
  summary: ExperimentSummaryType | null;
  results: ExperimentResult[];
  isRunning: boolean;
  onRunExperiment: (experimentId: string) => void;
  onViewResults: () => void;
}

export default function ExperimentSummary({
  summary,
  results,
  isRunning,
  onRunExperiment,
  onViewResults,
}: ExperimentSummaryProps) {
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass p-4">
            <div className="text-2xl font-bold text-ui-accent">
              {summary.total_experiments}
            </div>
            <div className="text-ui-dim">Total Experiments</div>
          </div>
          <div className="glass p-4">
            <div className="text-2xl font-bold text-green-400">
              {summary.completed}
            </div>
            <div className="text-ui-dim">Completed</div>
          </div>
          <div className="glass p-4">
            <div className="text-2xl font-bold text-red-400">
              {summary.failed}
            </div>
            <div className="text-ui-dim">Failed</div>
          </div>
          <div className="glass p-4">
            <div className="text-2xl font-bold text-blue-400">
              {summary.running ? "Yes" : "No"}
            </div>
            <div className="text-ui-dim">Currently Running</div>
          </div>
        </div>
      )}

      {/* Experiment Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {EXPERIMENT_DEFINITIONS.map((exp) => {
          const expData = summary?.experiments.find((e) => e.id === exp.id);
          const result = results.find((r) => r.experiment_id === exp.id);

          return (
            <ExperimentCard
              key={exp.id}
              experiment={exp}
              expData={expData}
              result={result}
              isRunning={isRunning}
              onRun={onRunExperiment}
              onViewResults={onViewResults}
            />
          );
        })}
      </div>
    </div>
  );
}

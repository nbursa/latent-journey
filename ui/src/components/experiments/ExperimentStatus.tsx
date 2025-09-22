import { RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { ExperimentStatus as ExperimentStatusType } from "../../services/experimentsService";
import { EXPERIMENT_DEFINITIONS } from "../../types/experiments";

interface ExperimentStatusProps {
  status: ExperimentStatusType | null;
}

export default function ExperimentStatus({ status }: ExperimentStatusProps) {
  if (!status) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass p-4">
          <div className="text-2xl font-bold text-blue-400">
            {status.running ? "Yes" : "No"}
          </div>
          <div className="text-ui-dim">Currently Running</div>
        </div>
        <div className="glass p-4">
          <div className="text-2xl font-bold text-ui-accent">
            {status.progress.toFixed(1)}%
          </div>
          <div className="text-ui-dim">Progress</div>
        </div>
        <div className="glass p-4">
          <div className="text-2xl font-bold text-green-400">
            {status.completed_experiments.length}
          </div>
          <div className="text-ui-dim">Completed</div>
        </div>
        <div className="glass p-4">
          <div className="text-2xl font-bold text-red-400">
            {status.failed_experiments.length}
          </div>
          <div className="text-ui-dim">Failed</div>
        </div>
      </div>

      {/* Current Experiment */}
      {status.current_experiment && (
        <div className="card">
          <h3 className="font-semibold text-ui-text mb-2">
            Current Experiment
          </h3>
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="text-ui-text">{status.current_experiment}</span>
            <div className="flex-1 bg-ui-surface rounded-full h-2">
              <div
                className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${status.progress}%` }}
              />
            </div>
            <span className="text-sm text-ui-dim">
              {status.progress.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Completed Experiments */}
      {status.completed_experiments.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-ui-text mb-2">
            Completed Experiments
          </h3>
          <div className="flex flex-wrap gap-2">
            {status.completed_experiments.map((expId) => {
              const expDef = EXPERIMENT_DEFINITIONS.find((e) => e.id === expId);
              return (
                <div
                  key={expId}
                  className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-lg"
                >
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">
                    {expDef?.name || expId}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Failed Experiments */}
      {status.failed_experiments.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-ui-text mb-2">
            Failed Experiments
          </h3>
          <div className="flex flex-wrap gap-2">
            {status.failed_experiments.map((expId) => {
              const expDef = EXPERIMENT_DEFINITIONS.find((e) => e.id === expId);
              return (
                <div
                  key={expId}
                  className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg"
                >
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400">
                    {expDef?.name || expId}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import {
  ExperimentsService,
  ExperimentResult,
  ExperimentSummary,
  ExperimentStatus,
} from "../services/experimentsService";
import { useConfirmationModal } from "../hooks/useModal";
import { ConfirmationModal } from "../components/Modal";
import {
  ExperimentHeader,
  ExperimentSummary as ExperimentSummaryComponent,
  ExperimentResults,
  ExperimentStatus as ExperimentStatusComponent,
} from "../components/experiments";

export default function ExperimentsPage() {
  const [summary, setSummary] = useState<ExperimentSummary | null>(null);
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [status, setStatus] = useState<ExperimentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [runningExperimentId, setRunningExperimentId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<
    "summary" | "results" | "status"
  >("summary");

  const experimentsService = new ExperimentsService();

  // Confirmation modal for running all experiments
  const runAllConfirmation = useConfirmationModal({
    onConfirm: async () => {
      try {
        setIsRunning(true);
        setRunningExperimentId("ALL");
        setError(null);
        await experimentsService.runAllExperiments();
        await loadData();
      } catch (error) {
        setError(
          error instanceof Error ? error.message : "Failed to run experiments"
        );
      } finally {
        setIsRunning(false);
        setRunningExperimentId(null);
      }
    },
    title: "Run All Experiments",
    message:
      "This will run all 8 experiments sequentially. This may take several minutes. Continue?",
    confirmText: "Run All",
    cancelText: "Cancel",
    type: "info",
    isLoading: isRunning,
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [summaryData, resultsData, statusData] = await Promise.all([
        experimentsService.getSummary(),
        experimentsService.getResults(),
        experimentsService.getStatus(),
      ]);

      setSummary(summaryData);
      setResults(resultsData);
      setStatus(statusData);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load experiment data"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const runExperiment = async (experimentId: string) => {
    try {
      setIsRunning(true);
      setRunningExperimentId(experimentId);
      setError(null);
      await experimentsService.runExperiment(experimentId);
      await loadData();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : `Failed to run experiment ${experimentId}`
      );
    } finally {
      setIsRunning(false);
      setRunningExperimentId(null);
    }
  };

  const refreshData = async () => {
    await loadData();
  };

  useEffect(() => {
    loadData();

    // Auto-refresh every 5 seconds when experiments are running
    const interval = setInterval(() => {
      if (status?.running) {
        loadData();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [status?.running]);

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-ui-accent animate-spin mx-auto mb-4" />
          <p className="text-ui-dim">Loading experiment data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header Controls */}
      <ExperimentHeader
        isLoading={isLoading}
        isRunning={isRunning || status?.running || false}
        onRefresh={refreshData}
        onRunAll={() => runAllConfirmation.confirm()}
        selectedView={selectedView}
        onViewChange={setSelectedView}
      />

      {/* Error Display */}
      {error && (
        <div className="flex-shrink-0 p-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-red-400">{error}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {selectedView === "summary" && (
          <ExperimentSummaryComponent
            summary={summary}
            results={results}
            isRunning={isRunning || status?.running || false}
            runningExperimentId={runningExperimentId}
            onRunExperiment={runExperiment}
            onViewResults={() => setSelectedView("results")}
          />
        )}

        {selectedView === "results" && <ExperimentResults results={results} />}

        {selectedView === "status" && (
          <ExperimentStatusComponent status={status} />
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={runAllConfirmation.isOpen}
        onClose={runAllConfirmation.close}
        onConfirm={runAllConfirmation.onConfirm}
        title={runAllConfirmation.confirmationProps.title}
        message={runAllConfirmation.confirmationProps.message}
        confirmText={runAllConfirmation.confirmationProps.confirmText}
        cancelText={runAllConfirmation.confirmationProps.cancelText}
        type={runAllConfirmation.confirmationProps.type}
        isLoading={runAllConfirmation.confirmationProps.isLoading}
      />
    </div>
  );
}

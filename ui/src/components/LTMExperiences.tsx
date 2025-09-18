import React, { useState, useEffect } from "react";
import {
  Layers,
  RefreshCw,
  Trash2,
  AlertCircle,
  Play,
  Pause,
} from "lucide-react";
import { useEgo } from "../hooks/useEgo";
import { useServicesStatus } from "../hooks/useServicesStatus";
import { Memory } from "../types/memory";

interface Experience {
  id: string;
  title: string;
  summary: string;
  consolidated_from: string[];
  created_at: string;
  consolidated_at: string;
  themes: string[];
  emotional_tone: number;
  importance: number;
  context_hash: string;
  tags: string[];
}

interface LTMExperiencesProps {
  className?: string;
  memories?: Memory[];
}

const LTMExperiences: React.FC<LTMExperiencesProps> = ({
  className = "",
  memories = [],
}) => {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [isAutoGenerate, setIsAutoGenerate] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { servicesStatus, triggerStatusCheck } = useServicesStatus();

  // Use the simplified ego service
  const { totalMemories } = useEgo({
    memories,
    autoGenerate: false,
    intervalMs: 30000, // 30 seconds
  });

  // Get service status directly from useServicesStatus
  const isEgoAvailable = servicesStatus.ego === "online";
  const ollamaAvailable = servicesStatus.llm === "online";

  // Load LTM experiences
  const loadExperiences = async () => {
    try {
      console.log("Fetching LTM experiences from /api/ego/experiences");
      const response = await fetch("/api/ego/experiences");
      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("HTTP error response:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const data = await response.json();
      console.log("LTM experiences response:", data);

      if (data.success) {
        setExperiences(data.data);
        console.log(
          "LTM experiences loaded successfully:",
          data.data.length,
          "experiences"
        );
      } else {
        throw new Error(data.error || "Failed to load LTM experiences");
      }
    } catch (err) {
      console.error("Failed to load LTM experiences:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load LTM experiences"
      );
    }
  };

  // Consolidate memories into experiences
  const consolidateMemories = async () => {
    setIsConsolidating(true);
    setError(null);
    try {
      console.log("Consolidating memories into experiences");
      const response = await fetch("/api/ego/consolidate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          force: true,
          max_experiences: 5,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("HTTP error response:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Consolidation response:", data);

      if (data.success) {
        // Reload experiences after consolidation
        await loadExperiences();
        console.log("Memories consolidated successfully");
      } else {
        throw new Error(data.error || "Failed to consolidate memories");
      }
    } catch (err) {
      console.error("Failed to consolidate memories:", err);
      setError(
        err instanceof Error ? err.message : "Failed to consolidate memories"
      );
    } finally {
      setIsConsolidating(false);
    }
  };

  // Clear experiences
  const clearExperiences = async () => {
    if (!confirm("Are you sure you want to clear all experiences?")) {
      return;
    }

    setError(null);
    try {
      console.log("Clearing LTM experiences");
      const response = await fetch("/api/ego/clear-ltm", {
        method: "POST",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("HTTP error response:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Clear LTM response:", data);

      if (data.success) {
        setExperiences([]);
        console.log("LTM experiences cleared successfully");
      } else {
        throw new Error(data.error || "Failed to clear experiences");
      }
    } catch (err) {
      console.error("Failed to clear experiences:", err);
      setError(
        err instanceof Error ? err.message : "Failed to clear experiences"
      );
    }
  };

  // Load experiences on mount
  useEffect(() => {
    loadExperiences();
  }, []);

  // Clear experiences when memories array becomes empty (indicating data was cleared)
  useEffect(() => {
    if (memories.length === 0) {
      setExperiences([]);
    }
  }, [memories.length]);

  // Toggle auto-generation
  const toggleAutoGenerate = () => {
    setIsAutoGenerate(!isAutoGenerate);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap gap-y-2 items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-ui-text flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Experiences
        </h2>
        <div className="flex flex-wrap gap-y-2 items-center gap-2">
          {!isEgoAvailable && (
            <div title="Ego service not available">
              <AlertCircle className="w-4 h-4 text-red-400" />
            </div>
          )}

          {/* Auto-generate toggle */}
          <button
            onClick={toggleAutoGenerate}
            disabled={!isEgoAvailable}
            className={`px-2 py-1 text-xs flat flex items-center gap-1 ${
              isAutoGenerate ? "btn-primary" : "btn-secondary"
            }`}
            title={
              isAutoGenerate ? "Stop auto-generation" : "Start auto-generation"
            }
          >
            {isAutoGenerate ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            {isAutoGenerate ? "Pause" : "Auto"}
          </button>

          {/* Manual consolidate */}
          <button
            onClick={consolidateMemories}
            disabled={isConsolidating || !isEgoAvailable || !ollamaAvailable}
            className="px-2 py-1 text-xs flat flex items-center gap-1 btn-secondary disabled:opacity-50"
            title={
              !isEgoAvailable
                ? "Ego service not available"
                : !ollamaAvailable
                ? "Ollama not available - needed for AI consolidation"
                : "Consolidate thoughts into experiences"
            }
          >
            <RefreshCw
              className={`w-3 h-3 ${isConsolidating ? "animate-spin" : ""}`}
            />
            Consolidate
          </button>

          <button
            onClick={loadExperiences}
            className="px-2 py-1 text-xs flat flex items-center gap-1 btn-secondary"
            title="Refresh LTM data"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>

          <button
            onClick={triggerStatusCheck}
            className="px-2 py-1 text-xs flat flex items-center gap-1 btn-secondary"
            title="Refresh service status"
          >
            <RefreshCw className="w-3 h-3" />
            Status
          </button>

          <button
            onClick={clearExperiences}
            className="px-2 py-1 text-xs flat flex items-center gap-1 btn-secondary"
            title="Clear experiences"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Auto-generation status */}
      {isAutoGenerate && (
        <div className="mb-2 p-2 bg-green-500/10 text-xs text-green-300">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Auto-generating thoughts every 30 seconds</span>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 glass flat flex flex-col overflow-hidden">
        {/* Error message */}
        {error && (
          <div className="mx-3 mt-3 p-3 bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Ollama Status */}
        {!ollamaAvailable && (
          <div className="m-1 sm:m-3 p-2 sm:p-3 bg-yellow-500/20 text-yellow-300 text-xs sm:text-sm">
            <div className="font-semibold mb-1 sm:mb-2 flex items-center gap-2">
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Ollama Not Available</span>
              <span className="sm:hidden">Ollama Missing</span>
            </div>
            <div className="space-y-1 sm:space-y-2 text-xs">
              <p className="hidden sm:block">
                To enable AI experience consolidation, you need to install and
                run Ollama:
              </p>
              <p className="sm:hidden">Install Ollama to enable AI features:</p>
              <div className="bg-black/20 p-1 sm:p-2 rounded font-mono text-xs">
                <div className="hidden sm:block">
                  <strong>Install:</strong>
                </div>
                <div className="text-xs">
                  • macOS: <code>brew install ollama</code>
                </div>
                <div className="text-xs">
                  • Linux:{" "}
                  <code>curl -fsSL https://ollama.ai/install.sh | sh</code>
                </div>
                <div className="text-xs">
                  • Windows: Download from https://ollama.ai/download
                </div>
                <div className="mt-1 sm:mt-2 hidden sm:block">
                  <strong>Run:</strong>
                </div>
                <div className="text-xs">
                  • <code>ollama serve</code>
                </div>
                <div className="mt-1 sm:mt-2 hidden sm:block">
                  <strong>Pull Model:</strong>
                </div>
                <div className="text-xs">
                  • <code>ollama pull llama3.1:8b-instruct</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Experiences List */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto scrollbar-thin">
            <div className="space-y-2 p-3">
              {experiences.length === 0 ? (
                <div className="text-center text-ui-muted py-8">
                  {isConsolidating ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Consolidating experiences...</span>
                    </div>
                  ) : (
                    <div className="text-sm">
                      {!isEgoAvailable
                        ? "Ego service not available"
                        : isAutoGenerate
                        ? "Auto-generation enabled - experiences will appear here"
                        : "Click Consolidate to create experiences from thoughts"}
                    </div>
                  )}
                </div>
              ) : (
                experiences.map((experience, index) => (
                  <div
                    key={index}
                    className="text-sm bg-ui-surface/30 border-b border-white/10 hover:border-white/20 transition-colors"
                  >
                    {/* Experience Header */}
                    <div className="flex flex-col gap-2 mb-2">
                      <div className="flex items-center justify-between text-xs text-ui-muted">
                        <span>
                          {formatTimestamp(experience.consolidated_at)}
                        </span>
                        <div className="flex flex-wrap justify-end gap-y-2 items-center gap-2">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs">
                            LTM
                          </span>
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs">
                            Consolidated
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ui-muted">
                          Tone: {(experience.emotional_tone * 100).toFixed(0)}%
                        </span>
                        <span className="text-ui-muted">
                          Importance: {(experience.importance * 100).toFixed(0)}
                          %
                        </span>
                      </div>
                    </div>

                    {/* Experience Content */}
                    <div className="text-xs pb-2 text-ui-text leading-relaxed">
                      <div className="font-semibold text-blue-300 mb-1">
                        {experience.title}
                      </div>
                      <div className="text-ui-muted">{experience.summary}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap gap-y-2 items-center justify-between text-xs text-ui-muted mt-2 p-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span>Mode: {isAutoGenerate ? "Auto" : "Manual"}</span>
          </div>
          <div className="flex flex-wrap gap-y-2 items-center gap-4">
            <span>Experiences: {experiences.length}</span>
            <span>Memories: {totalMemories}</span>
            <span>Service: Ego</span>
            <span
              className={`flex items-center gap-1 ${
                ollamaAvailable ? "text-green-400" : "text-red-400"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  ollamaAvailable ? "bg-green-400" : "bg-red-400"
                }`}
              ></div>
              Ollama
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LTMExperiences;

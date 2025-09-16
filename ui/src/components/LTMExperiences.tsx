import { useState, useEffect } from "react";
import { RefreshCw, Trash2, Layers, Sparkles, AlertCircle } from "lucide-react";
import { useEgo } from "../hooks/useEgo";

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

export default function LTMExperiences() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the ego service to get Ollama status
  const { isEgoAvailable, ollamaAvailable, ollamaStatus } = useEgo({
    memories: [],
    autoGenerate: false,
    intervalMs: 30000,
  });

  const loadExperiences = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ego/experiences");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setExperiences(data.data);
      } else {
        throw new Error(data.error || "Failed to load experiences");
      }
    } catch (err) {
      console.error("Failed to load experiences:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load experiences"
      );
    } finally {
      setLoading(false);
    }
  };

  const consolidateMemories = async () => {
    setLoading(true);
    setError(null);
    try {
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // Reload experiences after consolidation
        await loadExperiences();
      } else {
        throw new Error(data.error || "Failed to consolidate memories");
      }
    } catch (err) {
      console.error("Failed to consolidate memories:", err);
      setError(
        err instanceof Error ? err.message : "Failed to consolidate memories"
      );
    } finally {
      setLoading(false);
    }
  };

  const clearExperiences = async () => {
    if (!confirm("Are you sure you want to clear all experiences?")) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ego/clear-ltm", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setExperiences([]);
      } else {
        throw new Error(data.error || "Failed to clear experiences");
      }
    } catch (err) {
      console.error("Failed to clear experiences:", err);
      setError(
        err instanceof Error ? err.message : "Failed to clear experiences"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExperiences();
  }, []);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-ui-text flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Experiences
        </h2>
        <div className="flex items-center gap-2">
          {!isEgoAvailable && (
            <div title="Ego service not available">
              <AlertCircle className="w-4 h-4 text-red-400" />
            </div>
          )}

          {/* Consolidate button */}
          <button
            onClick={consolidateMemories}
            disabled={loading || !isEgoAvailable || !ollamaAvailable}
            className="px-2 py-1 text-xs flat flex items-center gap-1 btn-secondary disabled:opacity-50"
            title={
              !isEgoAvailable
                ? "Ego service not available"
                : !ollamaAvailable
                ? "Ollama not available - needed for AI consolidation"
                : "Consolidate thoughts into experiences"
            }
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Consolidate
          </button>

          <button
            onClick={clearExperiences}
            className="px-2 py-1 text-xs flat flex items-center gap-1 btn-secondary"
            title="Clear all experiences"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 glass flat p-3 flex flex-col overflow-hidden">
        {/* Error message */}
        {error && (
          <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Ollama Status */}
        {!ollamaAvailable && ollamaStatus && (
          <div className="mb-3 p-3 bg-yellow-500/20 text-yellow-300 text-sm">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Ollama Not Available
            </div>
            <div className="space-y-2 text-xs">
              <p>
                To enable AI experience consolidation, you need to install and
                run Ollama:
              </p>
              <div className="bg-black/20 p-2 rounded font-mono text-xs">
                <div>
                  <strong>Install:</strong>
                </div>
                <div>
                  • macOS: <code>brew install ollama</code>
                </div>
                <div>
                  • Linux:{" "}
                  <code>curl -fsSL https://ollama.ai/install.sh | sh</code>
                </div>
                <div>• Windows: Download from https://ollama.ai/download</div>
                <div className="mt-2">
                  <strong>Run:</strong>
                </div>
                <div>
                  • <code>ollama serve</code>
                </div>
                <div className="mt-2">
                  <strong>Pull Model:</strong>
                </div>
                <div>
                  •{" "}
                  <code>
                    ollama pull{" "}
                    {ollamaStatus.ollama?.model || "llama3.1:8b-instruct"}
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Experiences List */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto scrollbar-thin">
            <div className="space-y-2 p-1">
              {loading && experiences.length === 0 ? (
                <div className="text-center text-ui-muted py-8">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Loading experiences...</span>
                  </div>
                </div>
              ) : experiences.length === 0 ? (
                <div className="text-center text-ui-muted py-8">
                  <div className="text-sm">
                    No experiences yet. Click "Consolidate" to create
                    experiences from thoughts.
                  </div>
                </div>
              ) : (
                experiences.map((experience) => (
                  <div
                    key={experience.id}
                    className="p-2 bg-ui-surface/30 border-b border-white/10 hover:border-white/20 transition-colors"
                  >
                    {/* Experience Header */}
                    <div className="flex flex-col gap-2 mb-2">
                      <div className="flex items-center justify-between text-xs text-ui-muted">
                        <span>{formatDate(experience.consolidated_at)}</span>
                        <div className="flex items-center gap-2">
                          <span className="px-1 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                            LTM
                          </span>
                          <span className="px-1 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">
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
                    <div className="text-sm text-ui-text leading-relaxed mb-2">
                      <div className="font-semibold text-blue-300 mb-1">
                        {experience.title}
                      </div>
                      <div className="text-ui-muted">{experience.summary}</div>
                    </div>

                    {/* Themes */}
                    <div className="flex flex-wrap gap-1">
                      {experience.themes.slice(0, 3).map((theme, index) => (
                        <span
                          key={index}
                          className="px-1 py-0.5 bg-green-500/20 text-green-300 rounded text-xs flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          {theme}
                        </span>
                      ))}
                      {experience.themes.length > 3 && (
                        <span className="text-xs text-ui-muted">
                          +{experience.themes.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-ui-muted mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span>Mode: Manual</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Experiences: {experiences.length}</span>
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
}

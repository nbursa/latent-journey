import { useState, useEffect } from "react";
import { RefreshCw, Trash2, Layers, Clock, Sparkles } from "lucide-react";

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
  const [selectedExperience, setSelectedExperience] =
    useState<Experience | null>(null);

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
        setSelectedExperience(null);
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

  const getEmotionalToneColor = (tone: number) => {
    if (tone < 0.3) return "text-red-300";
    if (tone < 0.7) return "text-yellow-300";
    return "text-green-300";
  };

  const getImportanceColor = (importance: number) => {
    if (importance < 0.3) return "bg-gray-500/20 text-gray-300";
    if (importance < 0.7) return "bg-yellow-500/20 text-yellow-300";
    return "bg-green-500/20 text-green-300";
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 max-h-full">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Experiences
        </h2>
        <div className="flex gap-2">
          <button
            onClick={consolidateMemories}
            disabled={loading}
            className="px-3 py-1 text-xs btn-primary flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Consolidating..." : "Consolidate"}
          </button>
          <button
            onClick={clearExperiences}
            disabled={loading}
            className="px-3 py-1 text-xs btn-primary flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-400 mb-3">
        {experiences.length} experience{experiences.length !== 1 ? "s" : ""}{" "}
        stored
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex-shrink-0 mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded">
          <div className="text-sm text-red-300">{error}</div>
          <button
            onClick={loadExperiences}
            className="mt-2 text-xs text-red-400 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      <div className="glass flat p-3 flex-1 overflow-y-auto min-h-0 max-h-full">
        {loading && experiences.length === 0 ? (
          <div className="text-gray-400 text-sm text-center py-4">
            Loading experiences...
          </div>
        ) : experiences.length === 0 ? (
          <div className="text-gray-400 text-sm text-center py-4">
            No experiences yet. Click "Consolidate" to create experiences from
            thoughts.
          </div>
        ) : (
          <div className="space-y-3">
            {experiences.map((experience) => (
              <div
                key={experience.id}
                onClick={() => setSelectedExperience(experience)}
                className={`border-b border-white/10 pb-3 last:border-b-0 cursor-pointer hover:bg-white/5 p-2 rounded ${
                  selectedExperience?.id === experience.id
                    ? "bg-blue-500/10 border border-blue-500/30"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-blue-300 truncate">
                      {experience.title}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {experience.summary}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`text-xs ${getEmotionalToneColor(
                          experience.emotional_tone
                        )}`}
                      >
                        Tone: {(experience.emotional_tone * 100).toFixed(0)}%
                      </span>
                      <div
                        className={`text-xs px-2 py-1 rounded ${getImportanceColor(
                          experience.importance
                        )}`}
                      >
                        {(experience.importance * 100).toFixed(0)}% important
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-1 ml-2">
                    <Clock className="w-3 h-3" />
                    {formatDate(experience.consolidated_at)}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {experience.themes.slice(0, 3).map((theme, index) => (
                    <span
                      key={index}
                      className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      {theme}
                    </span>
                  ))}
                  {experience.themes.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{experience.themes.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

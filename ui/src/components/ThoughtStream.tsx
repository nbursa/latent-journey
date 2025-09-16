import React, { useState, useEffect } from "react";
import {
  Brain,
  RefreshCw,
  Trash2,
  Layers,
  AlertCircle,
  Play,
  Pause,
} from "lucide-react";
import { useEgo } from "../hooks/useEgo";
import { useSTMData } from "../hooks/useSTMData";
import { Memory } from "../types/memory";

interface Thought {
  content: string;
  confidence: number;
  evidence: string[];
  emotional_tone: string;
  self_reference: boolean;
  creative_insight: boolean;
  timestamp: string;
  context_hash: string;
}

interface ConsciousnessMetrics {
  self_awareness: number;
  memory_consolidation: number;
  emotional_stability: number;
  creative_insights: number;
  unexpected_behaviors: number;
  attention_coherence: number;
  timestamp: string;
}

interface ThoughtStreamProps {
  className?: string;
  memories?: Memory[];
}

const ThoughtStream: React.FC<ThoughtStreamProps> = ({
  className = "",
  memories = [],
}) => {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [metrics, setMetrics] = useState<ConsciousnessMetrics | null>(null);
  const [isAutoGenerate, setIsAutoGenerate] = useState(false);

  // Use the simplified ego service
  const {
    currentThought,
    isGenerating,
    isEgoAvailable,
    ollamaAvailable,
    ollamaStatus,
    error,
    generateThought,
    consolidateMemories,
    clearHistory,
    totalMemories,
  } = useEgo({
    memories,
    autoGenerate: isAutoGenerate,
    intervalMs: 30000, // 30 seconds
  });

  // Get STM data
  const {
    thoughts: stmThoughts,
    loading: stmLoading,
    error: stmError,
    refetch: refetchSTM,
  } = useSTMData();

  // Convert STM data to thoughts format - USE ACTUAL DATA
  useEffect(() => {
    if (stmThoughts.length > 0) {
      const convertedThoughts = stmThoughts.map((thought) => ({
        content: thought.content,
        confidence: 0.8,
        evidence: [],
        emotional_tone:
          thought.facets.emotional_stability > 0.7
            ? "positive"
            : thought.facets.emotional_stability < 0.3
            ? "negative"
            : "neutral",
        self_reference: thought.facets.self_awareness > 0.5,
        creative_insight: thought.facets.creative_insight > 0.5,
        timestamp: (() => {
          try {
            const date = new Date(thought.ts * 1000);
            if (isNaN(date.getTime())) {
              console.warn("Invalid timestamp:", thought.ts);
              return new Date().toISOString();
            }
            return date.toISOString();
          } catch (error) {
            console.warn("Error converting timestamp:", thought.ts, error);
            return new Date().toISOString();
          }
        })(),
        context_hash: thought.facets.context_hash || "unknown",
      }));
      setThoughts(convertedThoughts);
    } else {
      setThoughts([]);
    }
  }, [stmThoughts]);

  // Handle STM refresh - just refetch, the effect will handle it
  const handleSTMRefresh = () => {
    refetchSTM();
  };

  // Clear thoughts when memories array becomes empty (indicating data was cleared)
  useEffect(() => {
    if (memories.length === 0) {
      setThoughts([]);
      setMetrics(null);
      clearHistory();
    }
  }, [memories.length, clearHistory]);

  // Note: We only show STM data, not currentThought

  // Convert ego metrics to legacy format
  useEffect(() => {
    if (currentThought) {
      const legacyMetrics: ConsciousnessMetrics = {
        self_awareness: currentThought.metrics.self_awareness,
        memory_consolidation: currentThought.metrics.memory_consolidation_need,
        emotional_stability: currentThought.metrics.emotional_stability,
        creative_insights: currentThought.metrics.creative_insight,
        unexpected_behaviors: 0, // Not tracked in new system
        attention_coherence: 0.5, // Default value
        timestamp: currentThought.generated_at,
      };
      setMetrics(legacyMetrics);
    }
  }, [currentThought]);

  // Handle memory consolidation
  const handleConsolidate = async () => {
    if (currentThought && currentThought.consolidate.length > 0) {
      await consolidateMemories(currentThought.consolidate);
    }
  };

  // Toggle auto-generation
  const toggleAutoGenerate = () => {
    setIsAutoGenerate(!isAutoGenerate);
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        console.warn("Invalid timestamp in formatTimestamp:", timestamp);
        return "Invalid time";
      }
      return date.toLocaleTimeString();
    } catch (error) {
      console.warn("Error formatting timestamp:", timestamp, error);
      return "Invalid time";
    }
  };

  const getMetricColor = (value: number) => {
    if (value >= 0.7) return "text-green-400";
    if (value >= 0.4) return "text-yellow-400";
    return "text-red-400";
  };

  const getMetricLabel = (value: number) => {
    if (value >= 0.7) return "High";
    if (value >= 0.4) return "Medium";
    return "Low";
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap gap-y-2 items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-ui-text flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Thoughts
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

          {/* Manual refresh */}
          <button
            onClick={() => generateThought()}
            disabled={isGenerating || !isEgoAvailable}
            className="px-2 py-1 text-xs flat flex items-center gap-1 btn-secondary disabled:opacity-50"
            title="Generate new thought manually"
          >
            <RefreshCw
              className={`w-3 h-3 ${isGenerating ? "animate-spin" : ""}`}
            />
            Manual
          </button>

          <button
            onClick={handleSTMRefresh}
            className="px-2 py-1 text-xs flat flex items-center gap-1 btn-secondary"
            title="Refresh STM data"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>

          <button
            onClick={clearHistory}
            className="px-2 py-1 text-xs flat flex items-center gap-1 btn-secondary"
            title="Clear history"
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
          <div className="mx-3 mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* STM Error message */}
        {stmError && (
          <div className="mx-3 mt-3 p-3 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-sm">
            STM Error: {stmError}
          </div>
        )}

        {/* Ollama Status */}
        {!ollamaAvailable && ollamaStatus && (
          <div className="m-3 p-3 bg-yellow-500/20 text-yellow-300 text-sm">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Ollama Not Available
            </div>
            <div className="space-y-2 text-xs">
              <p>
                To enable AI thought generation, you need to install and run
                Ollama:
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

        {/* Consciousness Metrics */}
        {metrics && (
          <div className="mb-3 p-3 pb-3 bg-ui-surface/50 border-b border-white/10">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ui-muted">Self-Awareness:</span>
                <span className={getMetricColor(metrics.self_awareness)}>
                  {getMetricLabel(metrics.self_awareness)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ui-muted">Memory Consolidation:</span>
                <span className={getMetricColor(metrics.memory_consolidation)}>
                  {getMetricLabel(metrics.memory_consolidation)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ui-muted">Emotional Stability:</span>
                <span className={getMetricColor(metrics.emotional_stability)}>
                  {getMetricLabel(metrics.emotional_stability)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ui-muted">Creative Insights:</span>
                <span className={getMetricColor(metrics.creative_insights)}>
                  {getMetricLabel(metrics.creative_insights)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Thoughts List */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto scrollbar-thin">
            <div className="space-y-2 p-3">
              {stmLoading ? (
                <div className="text-center text-ui-muted py-8">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Loading STM data...</span>
                  </div>
                </div>
              ) : thoughts.length === 0 ? (
                <div className="text-center text-ui-muted py-8">
                  {isGenerating ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating thought...</span>
                    </div>
                  ) : (
                    <div className="text-sm">
                      {!isEgoAvailable
                        ? "Ego service not available"
                        : isAutoGenerate
                        ? "Auto-generation enabled - thoughts will appear here"
                        : "Click Auto to enable auto-generation or Manual for manual generation"}
                    </div>
                  )}
                </div>
              ) : (
                thoughts.map((thought, index) => (
                  <div
                    key={index}
                    className="text-sm bg-ui-surface/30 border-b border-white/10 hover:border-white/20 transition-colors"
                  >
                    {/* Thought Header */}
                    <div className="flex flex-col gap-2 mb-2">
                      <div className="flex items-center justify-between text-xs text-ui-muted">
                        <span>{formatTimestamp(thought.timestamp)}</span>
                        <div className="flex flex-wrap justify-end gap-y-2 items-center gap-2">
                          {thought.self_reference && (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300  text-xs">
                              Self-Ref
                            </span>
                          )}
                          {thought.creative_insight && (
                            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs">
                              Creative
                            </span>
                          )}
                          <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs">
                            Grounded
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-ui-muted">
                          Tone: {thought.emotional_tone}
                        </span>
                        <span className="text-ui-muted">
                          Confidence: {Math.round(thought.confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Thought Content */}
                    <div className="text-xs pb-2 text-ui-text leading-relaxed">
                      {thought.content}
                    </div>

                    {/* Consolidation Actions */}
                    {currentThought &&
                      currentThought.consolidate.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-white/10">
                          <button
                            onClick={handleConsolidate}
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            <Layers className="w-3 h-3" />
                            Consolidate {currentThought.consolidate.length}{" "}
                            memories
                          </button>
                        </div>
                      )}
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
            <span>Thoughts: {thoughts.length}</span>
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

export default ThoughtStream;

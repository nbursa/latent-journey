import React, { useState, useEffect } from "react";
import { Brain, Heart, Eye, Zap, Clock } from "lucide-react";

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
}

const ThoughtStream: React.FC<ThoughtStreamProps> = ({ className = "" }) => {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [metrics, setMetrics] = useState<ConsciousnessMetrics | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch thought history
  const fetchThoughtHistory = async () => {
    try {
      const response = await fetch("/api/llm/thought-history?limit=20");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setThoughts(data.thoughts || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch thought history:", err);
    }
  };

  // Fetch consciousness metrics
  const fetchConsciousnessMetrics = async () => {
    try {
      const response = await fetch("/api/llm/consciousness-metrics?limit=1");
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.metrics.length > 0) {
          setMetrics(data.metrics[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch consciousness metrics:", err);
    }
  };

  // Generate a new thought
  const generateThought = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Get recent memory events for context
      const memoryResponse = await fetch("/api/memory?limit=10");
      const memoryData = await memoryResponse.json();

      const requestData = {
        recent_events: memoryData.events || [],
        emotional_state: {
          valence: 0.5, // Default neutral
          arousal: 0.5,
        },
        attention_focus: ["current_experience", "memory_patterns"],
        memory_patterns: [],
      };

      const response = await fetch("/api/llm/generate-thought", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Refresh thoughts and metrics
          await fetchThoughtHistory();
          await fetchConsciousnessMetrics();
        } else {
          setError(data.error || "Failed to generate thought");
        }
      } else {
        setError("Failed to generate thought");
      }
    } catch (err) {
      setError("Network error while generating thought");
      console.error("Thought generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchThoughtHistory();
    fetchConsciousnessMetrics();
  }, []);

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Get emotional tone color
  const getEmotionalToneColor = (tone: string) => {
    switch (tone) {
      case "positive":
        return "text-green-400";
      case "negative":
        return "text-red-400";
      default:
        return "text-blue-400";
    }
  };

  // Get consciousness level color
  const getConsciousnessColor = (value: number) => {
    if (value >= 0.8) return "text-green-400";
    if (value >= 0.6) return "text-yellow-400";
    if (value >= 0.4) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 max-h-full overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Thoughts</h3>
      </div>

      <div
        className={`flex-1 glass flat p-3 flex flex-col overflow-hidden ${className}`}
      >
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={generateThought}
            disabled={isGenerating}
            className="btn-primary text-sm px-3 py-1 disabled:opacity-50"
          >
            {isGenerating ? "Thinking..." : "Generate Thought"}
          </button>
        </div>

        {/* Consciousness Metrics */}
        {metrics && (
          <div className="mb-3 p-2 pb-3 bg-ui-surface/50 border-b border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold">
                Consciousness Metrics
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <div className="flex justify-between">
                <span>Self-Awareness:</span>
                <span className={getConsciousnessColor(metrics.self_awareness)}>
                  {(metrics.self_awareness * 100).toFixed(0)}%
                </span>
              </div>

              <div className="flex justify-between">
                <span>Memory Consolidation:</span>
                <span
                  className={getConsciousnessColor(
                    metrics.memory_consolidation
                  )}
                >
                  {(metrics.memory_consolidation * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Emotional Stability:</span>
                <span
                  className={getConsciousnessColor(metrics.emotional_stability)}
                >
                  {(metrics.emotional_stability * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Creative Insights:</span>
                <span
                  className={getConsciousnessColor(metrics.creative_insights)}
                >
                  {(metrics.creative_insights * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-1 p-2 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Thoughts List (scrollable) */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full overflow-y-auto scrollbar-thin">
            <div className="space-y-2 p-1">
              {thoughts.length === 0 ? (
                <div className="text-center text-ui-muted py-8">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No thoughts generated yet</p>
                  <p className="text-sm">Click "Generate Thought" to start</p>
                </div>
              ) : (
                thoughts.map((thought, index) => (
                  <div
                    key={`${thought.timestamp}-${index}`}
                    className="p-2 bg-ui-surface/30 border-b border-white/10 hover:border-white/20 transition-colors"
                  >
                    {/* Thought Header */}
                    <div className="flex items-start justify-between mb-2  pb-2">
                      <div className="w-full flex flex-col gap-2">
                        <span className="flex items-center gap-1 text-xs text-ui-muted">
                          <Clock className="w-3 h-3 text-ui-muted" />
                          {formatTimestamp(thought.timestamp)}
                        </span>
                        <div className="flex items-center gap-3">
                          {thought.self_reference && (
                            <span className="w-fit text-xs bg-purple-900/30 text-purple-300 px-2 py-0.5 rounded">
                              Self-Ref
                            </span>
                          )}
                          {thought.creative_insight && (
                            <span className="w-fit text-xs bg-yellow-900/30 text-yellow-300 px-2 py-0.5 rounded">
                              Creative
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-xs ${getEmotionalToneColor(
                              thought.emotional_tone
                            )}`}
                          >
                            {thought.emotional_tone}
                          </span>
                          <span className="text-xs text-ui-muted">
                            {(thought.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Thought Content */}
                    <div className="mb-2">
                      <p className="text-xs leading-relaxed">
                        {thought.content}
                      </p>
                    </div>

                    {/* Evidence */}
                    {thought.evidence.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-ui-muted">
                        <Zap className="w-3 h-3" />
                        <span>Evidence:</span>
                        <span>{thought.evidence.join(", ")}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-end text-xs text-ui-muted">
            <span>{thoughts.length} thoughts</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThoughtStream;

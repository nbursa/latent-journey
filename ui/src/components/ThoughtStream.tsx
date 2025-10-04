import React, { useState, useEffect } from "react";
import {
  Brain,
  RefreshCw,
  AlertCircle,
  Play,
  Pause,
  Zap,
  Clock,
} from "lucide-react";
import { useEgo } from "../hooks/useEgo";
import { useSTMData } from "../hooks/useSTMData";
import { useAutoGeneration } from "../hooks/useAutoGeneration";
import { Memory } from "../types/memory";
import { useServicesStatus } from "../hooks/useServicesStatus";
import { useAppStore } from "../stores/appStore";

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
  const { servicesStatus } = useServicesStatus();

  // Get events from app store for threshold monitoring
  const events = useAppStore((state) => state.events);

  const { currentThought, error, clearHistory, totalMemories } = useEgo({
    memories,
    autoGenerate: isAutoGenerate,
    intervalMs: 30000,
  });

  const isEgoAvailable = servicesStatus.ego === "online";
  const refnetAvailable = servicesStatus.llm === "online"; // RefNet service is now on the llm status slot

  // Auto generation hook for threshold-based automatic generation
  const autoGeneration = useAutoGeneration({
    eventThreshold: 10,
    thoughtThreshold: 10,
    checkIntervalMs: 5000,
    enabled: isAutoGenerate,
  });

  // Use manual generation loading state for buttons
  const isManualGenerating =
    autoGeneration.isGeneratingThought ||
    autoGeneration.isConsolidatingExperience;

  // Get STM data
  const {
    thoughts: stmThoughts,
    loading: stmLoading,
    error: stmError,
  } = useSTMData();

  // Convert STM data to thoughts format
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

  // Clear thoughts when memories array becomes empty (indicating data was cleared)
  useEffect(() => {
    if (memories.length === 0) {
      setThoughts([]);
      setMetrics(null);
      clearHistory();
    }
  }, [memories.length, clearHistory]);

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
            disabled={!isEgoAvailable || !refnetAvailable}
            className={`px-2 py-1 text-xs flat flex items-center gap-1 ${
              isAutoGenerate ? "btn-primary" : "btn-secondary"
            } ${!isEgoAvailable || !refnetAvailable ? "opacity-50" : ""}`}
            title={
              !isEgoAvailable
                ? "Ego service not available"
                : !refnetAvailable
                ? "RefNet service not available - needed for AI generation"
                : isAutoGenerate
                ? "Stop auto-generation"
                : "Start auto-generation"
            }
          >
            {isAutoGenerate ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            {isAutoGenerate ? "Pause" : "Auto"}
          </button>

          {/* Manual thought generation */}
          <button
            onClick={() => autoGeneration.triggerThoughtGeneration()}
            disabled={isManualGenerating || !isEgoAvailable || !refnetAvailable}
            className="px-2 py-1 text-xs flat flex items-center gap-1 btn-secondary disabled:opacity-50"
            title={
              !isEgoAvailable
                ? "Ego service not available"
                : !refnetAvailable
                ? "RefNet service not available - needed for AI generation"
                : autoGeneration.isGeneratingThought
                ? "Generating thought..."
                : "Generate new thought manually from current events"
            }
          >
            <RefreshCw
              className={`w-3 h-3 ${
                autoGeneration.isGeneratingThought ? "animate-spin" : ""
              }`}
            />
            Generate Thought
          </button>

          {/* Manual experience consolidation */}
          <button
            onClick={() => autoGeneration.triggerExperienceConsolidation()}
            disabled={isManualGenerating || !isEgoAvailable || !refnetAvailable}
            className="px-2 py-1 text-xs flat flex items-center gap-1 btn-secondary disabled:opacity-50"
            title={
              !isEgoAvailable
                ? "Ego service not available"
                : !refnetAvailable
                ? "ResNet service not available - needed for AI consolidation"
                : autoGeneration.isConsolidatingExperience
                ? "Consolidating experiences..."
                : "Consolidate current thoughts into experiences manually"
            }
          >
            <Zap
              className={`w-3 h-3 ${
                autoGeneration.isConsolidatingExperience ? "animate-pulse" : ""
              }`}
            />
            Consolidate
          </button>
        </div>
      </div>

      {/* Auto-generation status */}
      {isAutoGenerate && (
        <div className="mb-2 space-y-2">
          <div className="p-2 bg-green-500/10 text-xs text-green-300 rounded">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Automatic generation enabled</span>
            </div>
          </div>

          {/* Threshold indicators */}
          <div className="p-2 bg-blue-500/10 text-xs text-blue-300 rounded">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                <span>
                  {autoGeneration.eventsUntilThought > 0
                    ? `${autoGeneration.eventsUntilThought} events until thought`
                    : autoGeneration.awaitingThought
                    ? "Triggering thought generation..."
                    : "Ready for more events"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3" />
                <span>
                  {autoGeneration.thoughtsUntilExperience > 0
                    ? `${autoGeneration.thoughtsUntilExperience} thoughts until experience`
                    : autoGeneration.awaitingExperience
                    ? "Triggering experience..."
                    : "Ready for more thoughts"}
                </span>
              </div>
            </div>
          </div>

          {/* Event/Thought counters */}
          <div className="p-2 bg-purple-500/10 text-xs text-purple-300 rounded">
            <div className="grid grid-cols-2 gap-2">
              <div>Events: {events.length}</div>
              <div>Thoughts: {autoGeneration.thoughtCount}</div>
            </div>
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

        {/* STM Error message */}
        {stmError && (
          <div className="mx-3 mt-3 p-3 bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
            STM Error: {stmError}
          </div>
        )}

        {/* RefNet Status */}
        {!refnetAvailable && (
          <div className="m-1 sm:m-3 p-2 sm:p-3 bg-yellow-500/20 text-yellow-300 text-xs sm:text-sm">
            <div className="font-semibold mb-1 sm:mb-2 flex items-center gap-2">
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">
                RefNet Service Not Available
              </span>
              <span className="sm:hidden">RefNet Missing</span>
            </div>
            <div className="space-y-1 sm:space-y-2 text-xs">
              <p className="hidden sm:block">
                To enable AI thought generation, RefNet service needs to be
                running. Make sure all services are started with "make dev"
              </p>
              <p className="sm:hidden">
                Start RefNet service to enable AI features
              </p>
              <div className="bg-black/20 p-1 sm:p-2 font-mono text-xs">
                <div className="hidden sm:block">
                  <strong>Services:</strong>
                </div>
                <div className="text-xs">
                  • Start all services: <code>make dev</code>
                </div>
                <div className="text-xs">• RefNet runs on port 8084</div>
                <div className="text-xs">
                  • Uses trained model from RefNet training
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
                  {isManualGenerating ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>
                        {autoGeneration.isGeneratingThought
                          ? "Generating thought..."
                          : "Consolidating experiences..."}
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm">
                      {!isEgoAvailable
                        ? "Ego service not available"
                        : !refnetAvailable
                        ? "RefNet service not available - start services with 'make dev' to enable AI thought generation"
                        : isAutoGenerate
                        ? "Auto-generation enabled - thoughts will appear here"
                        : "Click Auto to enable auto-generation or Generate Thought for manual generation"}
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
            <span>Events: {events.length}</span>
            <span>Thoughts: {thoughts.length}</span>
            <span>Memories: {totalMemories}</span>
            <span>Service: RefNet</span>
            <span
              className={`flex items-center gap-1 ${
                refnetAvailable ? "text-green-400" : "text-red-400"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  refnetAvailable ? "bg-green-400" : "bg-red-400"
                }`}
              ></div>
              {refnetAvailable ? "Linked" : "Disconnected"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThoughtStream;

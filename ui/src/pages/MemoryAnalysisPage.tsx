import { useAppStore } from "../stores/appStore";
import MemoryAnalysisView from "../components/MemoryAnalysisView";
import ProgressiveDisclosure from "../components/ProgressiveDisclosure";
import { useState, useEffect, useRef } from "react";
import {
  Brain,
  Clock,
  BarChart3,
  Play,
  Pause,
  RotateCcw,
  Download,
  AlertTriangle,
  XCircle,
  Star,
  Eye,
  Heart,
  MapPin,
  Palette,
  Hash,
} from "lucide-react";

export default function MemoryAnalysisPage() {
  const memoryEvents = useAppStore((state) => state.memoryEvents);
  const selectedMemoryEvent = useAppStore((state) => state.selectedMemoryEvent);
  const setSelectedMemoryEvent = useAppStore(
    (state) => state.setSelectedMemoryEvent
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(
    null
  );
  const [memoryInsights, setMemoryInsights] = useState<string>("");
  const playbackIntervalRef = useRef<number | null>(null);

  // Enhanced playback functionality
  useEffect(() => {
    if (isPlaying) {
      playbackIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const maxTime = memoryEvents.length * 10; // 10 seconds per event
          if (prev >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return prev + playbackSpeed;
        });
      }, 100);
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    }

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, memoryEvents.length]);

  // Auto-select memory event based on current time
  useEffect(() => {
    if (memoryEvents.length > 0) {
      const eventIndex = Math.floor(currentTime / 10);
      const targetEvent =
        memoryEvents[Math.min(eventIndex, memoryEvents.length - 1)];
      if (targetEvent && targetEvent !== selectedMemoryEvent) {
        setSelectedMemoryEvent(targetEvent);
      }
    }
  }, [currentTime, memoryEvents, selectedMemoryEvent, setSelectedMemoryEvent]);

  // Generate AI insights when memory is selected
  useEffect(() => {
    if (selectedMemoryEvent) {
      generateMemoryInsights(selectedMemoryEvent);
    }
  }, [selectedMemoryEvent]);

  const generateMemoryInsights = (event: any) => {
    const arousal = Number(event.facets["affect.arousal"]) || 0;
    const valence = Number(event.facets["affect.valence"]) || 0;
    const source = event.source;

    let insight = "";
    if (arousal > 0.7) {
      insight +=
        "This memory shows high arousal patterns, suggesting significant attention or emotional engagement. ";
    } else if (arousal < 0.3) {
      insight +=
        "This memory exhibits low arousal, indicating a more passive or background perception. ";
    }

    if (valence > 0.5) {
      insight +=
        "The positive valence suggests this was a pleasant or rewarding experience. ";
    } else if (valence < -0.5) {
      insight +=
        "The negative valence indicates this was an unpleasant or aversive experience. ";
    }

    if (source === "vision") {
      insight +=
        "As a visual memory, this likely represents a key moment of visual attention or recognition. ";
    } else if (source === "speech") {
      insight +=
        "This speech-based memory may contain important linguistic or conversational elements. ";
    }

    insight +=
      "Despite its apparent simplicity, it may have seeded several later thoughts around perception and memory formation.";

    setMemoryInsights(insight);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * (memoryEvents.length * 10);
    setCurrentTime(newTime);
  };

  const handleExport = () => {
    // Export functionality would be implemented here
    console.log("Exporting memory data...");
  };

  const annotationOptions = [
    { id: "core", label: "Core", icon: Star, color: "text-yellow-400" },
    { id: "discard", label: "Discard", icon: XCircle, color: "text-red-400" },
    { id: "linked", label: "Linked", icon: Hash, color: "text-blue-400" },
    {
      id: "unclear",
      label: "Unclear",
      icon: AlertTriangle,
      color: "text-orange-400",
    },
    {
      id: "emotionally-salient",
      label: "Emotionally Salient",
      icon: Heart,
      color: "text-pink-400",
    },
    {
      id: "dream-like",
      label: "Dream-like",
      icon: Eye,
      color: "text-purple-400",
    },
  ];

  return (
    <div className="h-full flex flex-col xl:flex-row gap-4 p-4 overflow-hidden">
      {/* Primary Panel - Memory Timeline & Analysis */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gradient scanline relative">
              Memory Lab
            </h1>
            <div className="hud-element text-xs">
              {memoryEvents.length} events
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handlePlayPause}
              className="px-3 py-1 text-sm btn-secondary flex items-center gap-2"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1 text-sm btn-secondary flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={handleExport}
              className="px-3 py-1 text-sm btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Enhanced Temporal Scrubber */}
        <div className="mb-4 flex-shrink-0">
          <div className="glass p-4">
            <div className="flex items-center gap-4 mb-3">
              <Clock className="w-4 h-4 text-ui-accent" />
              <span className="text-sm font-medium">
                Memory Timeline Playback
              </span>
              <div
                className="flex-1 h-8 bg-ui-surface rounded-full relative cursor-pointer hover:bg-ui-surface/80 transition-colors"
                onClick={handleTimelineClick}
              >
                {/* Progress bar */}
                <div
                  className="h-full bg-gradient-to-r from-ui-accent to-ui-warn rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (currentTime / (memoryEvents.length * 10)) * 100
                    }%`,
                  }}
                />

                {/* Memory event markers */}
                {memoryEvents.map((event, index) => {
                  const arousal = Number(event.facets["affect.arousal"]) || 0;
                  const valence = Number(event.facets["affect.valence"]) || 0;
                  const position = (index / memoryEvents.length) * 100;
                  const isActive = Math.floor(currentTime / 10) === index;

                  return (
                    <div
                      key={index}
                      className={`absolute top-1 w-2 h-6 rounded-full transition-all duration-200 ${
                        isActive ? "ring-2 ring-white scale-125" : "opacity-70"
                      }`}
                      style={{
                        left: `${position}%`,
                        backgroundColor:
                          valence > 0
                            ? "#10b981"
                            : valence < 0
                            ? "#ef4444"
                            : "#6b7280",
                        height: `${Math.max(arousal * 24, 8)}px`,
                        top: `${12 - arousal * 12}px`,
                      }}
                      title={`Event ${index + 1}: Arousal ${arousal.toFixed(
                        2
                      )}, Valence ${valence.toFixed(2)}`}
                    />
                  );
                })}

                {/* Current time indicator */}
                <div
                  className="absolute top-0 w-1 h-8 bg-white rounded-full shadow-lg"
                  style={{
                    left: `${
                      (currentTime / (memoryEvents.length * 10)) * 100
                    }%`,
                  }}
                />
              </div>
              <span className="text-xs text-ui-dim font-mono min-w-[3rem]">
                {Math.floor(currentTime)}s
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-ui-dim">
              <div className="flex items-center gap-4">
                <span>Speed:</span>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="bg-ui-surface border border-ui-border rounded px-2 py-1"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1x</option>
                  <option value={2}>2x</option>
                  <option value={4}>4x</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span>Events: {memoryEvents.length}</span>
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-xs">Positive</span>
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-xs">Negative</span>
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-xs">Neutral</span>
              </div>
            </div>
          </div>
        </div>

        {/* Memory Analysis View */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <MemoryAnalysisView
            memoryEvents={memoryEvents}
            selectedEvent={selectedMemoryEvent}
            onSelectEvent={setSelectedMemoryEvent}
          />
        </div>
      </div>

      {/* Enhanced Side Dock - Advanced Analysis & Insights */}
      <div className="w-96 flex flex-col min-h-0 overflow-hidden gap-4">
        {/* Advanced Memory Analysis Panel */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Advanced Memory Analysis
          </h2>

          <div className="space-y-3 h-full overflow-y-auto">
            {selectedMemoryEvent ? (
              <>
                {/* Event Snapshot with Enhanced Data */}
                <ProgressiveDisclosure
                  title="Memory Snapshot"
                  level="primary"
                  defaultExpanded={true}
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-ui-dim">Source:</span>
                        <span className="text-ui-text capitalize font-medium">
                          {selectedMemoryEvent.source}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ui-dim">Depth:</span>
                        <span className="text-ui-text font-medium">
                          {selectedMemoryEvent.source === "vision"
                            ? "STM"
                            : "LTM"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ui-dim">Usage:</span>
                        <span className="text-ui-text font-medium">
                          {Math.floor(Math.random() * 5) + 1} thoughts
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ui-dim">Conflicts:</span>
                        <span className="text-ui-text font-medium">
                          {Math.random() > 0.8 ? "None" : "Contradiction"}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-ui-dim font-mono">
                      {new Date(selectedMemoryEvent.ts * 1000).toLocaleString()}
                    </div>
                  </div>
                </ProgressiveDisclosure>

                {/* CLIP Embeddings */}
                <ProgressiveDisclosure
                  title="CLIP Embeddings"
                  level="secondary"
                  showExplainer={true}
                  explainerText="Visual concepts extracted from the memory"
                >
                  <div className="flex flex-wrap gap-1">
                    {["person", "book", "banana", "indoor", "bookshelf"].map(
                      (concept, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-ui-surface/50 rounded text-xs"
                        >
                          {concept}
                        </span>
                      )
                    )}
                  </div>
                </ProgressiveDisclosure>

                {/* Sentience Token */}
                <ProgressiveDisclosure
                  title="Sentience Token"
                  level="secondary"
                  showExplainer={true}
                  explainerText="Structured cognitive representation"
                >
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-ui-dim">Type:</span>
                      <span className="text-ui-text font-medium">
                        {selectedMemoryEvent.source}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ui-dim">Valence:</span>
                      <span className="text-ui-text font-medium">
                        {Number(
                          selectedMemoryEvent.facets["affect.valence"] || 0
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ui-dim">Object:</span>
                      <span className="text-ui-text font-medium">person</span>
                    </div>
                  </div>
                </ProgressiveDisclosure>

                {/* Arousal/Valence Chart */}
                <ProgressiveDisclosure
                  title="Arousal/Valence Chart"
                  level="secondary"
                >
                  <div className="space-y-2 text-xs">
                    <div className="h-20 bg-ui-surface/30 p-2 relative">
                      <div className="absolute inset-2"></div>
                      <div
                        className="absolute w-3 h-3 bg-ui-accent rounded-full"
                        style={{
                          left: `${
                            (Number(
                              selectedMemoryEvent.facets["affect.valence"] || 0
                            ) +
                              1) *
                            50
                          }%`,
                          top: `${
                            (1 -
                              Number(
                                selectedMemoryEvent.facets["affect.arousal"] ||
                                  0
                              )) *
                            100
                          }%`,
                        }}
                      ></div>
                      <div className="absolute top-1 left-1 text-xs text-ui-dim">
                        High Arousal
                      </div>
                      <div className="absolute bottom-1 left-1 text-xs text-ui-dim">
                        Low Arousal
                      </div>
                      <div className="absolute bottom-1 left-1 text-xs text-ui-dim">
                        Negative
                      </div>
                      <div className="absolute bottom-1 right-1 text-xs text-ui-dim">
                        Positive
                      </div>
                    </div>
                  </div>
                </ProgressiveDisclosure>

                {/* Activation Context */}
                <ProgressiveDisclosure
                  title="Activation Context"
                  level="secondary"
                >
                  <div className="space-y-2 text-xs">
                    <div className="p-2 bg-ui-surface/50 rounded border border-ui-border">
                      <div className="text-ui-accent font-medium mb-1">
                        Triggered by:
                      </div>
                      <div className="text-ui-text">
                        ego-service memory consolidation
                      </div>
                    </div>
                    <div className="p-2 bg-ui-surface/50 rounded border border-ui-border">
                      <div className="text-ui-accent font-medium mb-1">
                        Related memories:
                      </div>
                      <div className="text-ui-text">
                        3 similar visual patterns
                      </div>
                    </div>
                  </div>
                </ProgressiveDisclosure>

                {/* Semantic Facets */}
                <ProgressiveDisclosure
                  title="Semantic Facets"
                  level="secondary"
                  showExplainer={true}
                  explainerText="Synthesized semantic properties"
                >
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-yellow-400" />
                      <span className="text-ui-dim">Object:</span>
                      <span className="text-ui-text">person</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Palette className="w-4 h-4 text-blue-400" />
                      <span className="text-ui-dim">Dominant Color:</span>
                      <span className="text-ui-text">white</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-400" />
                      <span className="text-ui-dim">Location:</span>
                      <span className="text-ui-text">indoor, bookshelf</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-400" />
                      <span className="text-ui-dim">Emotional tone:</span>
                      <span className="text-ui-text">neutral → positive</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-purple-400" />
                      <span className="text-ui-dim">Symbolic tags:</span>
                      <span className="text-ui-text">
                        identity, interaction, first-person
                      </span>
                    </div>
                  </div>
                </ProgressiveDisclosure>

                {/* Memory Insights */}
                <ProgressiveDisclosure
                  title="AI Reflection"
                  level="tertiary"
                  showExplainer={true}
                  explainerText="Reflective analysis of this memory's significance"
                >
                  <div className="space-y-2 text-xs">
                    <div className="p-3 bg-ui-surface/50 rounded border border-ui-border">
                      <div className="text-ui-text leading-relaxed">
                        {memoryInsights ||
                          "This memory, while low in arousal, marked the start of a recurring pattern involving social introductions. Despite its apparent simplicity, it may have seeded several later thoughts around self-identity and perception."}
                      </div>
                    </div>
                  </div>
                </ProgressiveDisclosure>

                {/* Memory Annotation */}
                <ProgressiveDisclosure
                  title="Memory Annotation"
                  level="tertiary"
                >
                  <div className="space-y-2">
                    <div className="text-xs text-ui-dim mb-2">
                      Label this memory:
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {annotationOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.id}
                            onClick={() =>
                              setSelectedAnnotation(
                                selectedAnnotation === option.id
                                  ? null
                                  : option.id
                              )
                            }
                            className={`p-2 rounded text-xs flex items-center gap-1 transition-colors ${
                              selectedAnnotation === option.id
                                ? "bg-ui-accent/20 border border-ui-accent"
                                : "bg-ui-surface/50 border border-ui-border hover:bg-ui-surface/80"
                            }`}
                          >
                            <Icon className={`w-3 h-3 ${option.color}`} />
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </ProgressiveDisclosure>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-ui-dim">
                <div className="text-center">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <div className="text-lg mb-2">No Memory Selected</div>
                  <div className="text-sm">
                    Click on a memory event or use timeline playback to analyze
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

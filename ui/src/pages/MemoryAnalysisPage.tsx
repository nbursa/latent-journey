import { useAppStore } from "../stores/appStore";
import MemoryAnalysisView from "../components/MemoryAnalysisView";
import ProgressiveDisclosure from "../components/ProgressiveDisclosure";
import { useState, useEffect, useRef, useMemo } from "react";
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
  const [stmData, setStmData] = useState<any[]>([]);
  const [ltmData, setLtmData] = useState<any[]>([]);
  const [eventsData, setEventsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const playbackIntervalRef = useRef<number | null>(null);
  const previousSelectedMemoryRef = useRef<any>(null);
  const isUpdatingRef = useRef<boolean>(false);

  // Combine all memory data into a unified timeline
  const allMemoryEvents = useMemo(() => {
    const events = [
      // STM data - text-based thoughts with facets
      ...stmData.map((item) => ({
        ...item,
        source: "stm",
        type: "short_term",
        ts: new Date(item.timestamp).getTime() / 1000, // Convert timestamp to seconds
        content: item.content,
        facets: item.facets || {},
        tags: item.tags || [],
        embedding_id: item.id, // Use id as embedding_id
      })),
      // LTM data - consolidated experiences
      ...ltmData.map((item) => ({
        ...item,
        source: "ltm",
        type: "long_term",
        ts: new Date(item.created_at).getTime() / 1000,
        content: item.summary,
        facets: {
          "affect.valence": item.emotional_tone || 0,
          "affect.arousal": item.importance || 0,
          "consolidation.themes": item.themes || [],
          "consolidation.consolidated_from": item.consolidated_from || [],
        },
        tags: item.tags || [],
        title: item.title,
        summary: item.summary,
      })),
      // Events data - perception events (vision, speech)
      ...eventsData.map((item) => ({
        ...item,
        source: item.source || "event",
        type: "perception",
        ts: item.ts || Date.now() / 1000,
        facets: item.facets || {},
        embedding_id: item.embedding_id,
      })),
    ];

    const sortedEvents = events.sort((a, b) => a.ts - b.ts);
    return sortedEvents;
  }, [stmData, ltmData, eventsData]);

  // Load data
  useEffect(() => {
    const loadMemoryData = async () => {
      setIsLoading(true);
      try {
        // Load STM data from API
        const stmResponse = await fetch("/api/ego/memories");
        if (stmResponse.ok) {
          const stmResult = await stmResponse.json();
          const stmData = stmResult.data || [];
          setStmData(stmData);
        }

        // Load LTM data from API
        const ltmResponse = await fetch("/api/ego/experiences");
        if (ltmResponse.ok) {
          const ltmResult = await ltmResponse.json();
          const ltmData = ltmResult.data || [];
          setLtmData(ltmData);
        }

        // Load events data from API
        const eventsResponse = await fetch("/api/memory");
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          setEventsData(eventsData);
        }
      } catch (error) {
        console.error("Error loading memory data:", error);
        // Fallback to empty arrays if API calls fail
        setStmData([]);
        setLtmData([]);
        setEventsData([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMemoryData();
  }, []);

  // Playback functionality
  useEffect(() => {
    if (isPlaying) {
      playbackIntervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          const maxTime = allMemoryEvents.length * 10; // 10 seconds per event
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
  }, [isPlaying, playbackSpeed, allMemoryEvents.length]);

  // Auto-select memory event based on current time
  useEffect(() => {
    if (allMemoryEvents.length > 0 && !isUpdatingRef.current) {
      const eventIndex = Math.floor(currentTime / 10);
      const targetEvent =
        allMemoryEvents[Math.min(eventIndex, allMemoryEvents.length - 1)];

      // Compare by unique properties
      const isDifferent =
        !previousSelectedMemoryRef.current ||
        previousSelectedMemoryRef.current.ts !== targetEvent.ts ||
        previousSelectedMemoryRef.current.source !== targetEvent.source ||
        previousSelectedMemoryRef.current.embedding_id !==
          targetEvent.embedding_id;

      if (targetEvent && isDifferent) {
        isUpdatingRef.current = true;
        setSelectedMemoryEvent(targetEvent);
        previousSelectedMemoryRef.current = targetEvent;
        // Reset the flag after a delay
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 100);
      }
    }
  }, [currentTime, allMemoryEvents, setSelectedMemoryEvent]);

  // Reset previous memory ref when allMemoryEvents changes
  useEffect(() => {
    previousSelectedMemoryRef.current = null;
    isUpdatingRef.current = false;
  }, [allMemoryEvents]);

  // Generate AI insights when memory is selected
  useEffect(() => {
    if (selectedMemoryEvent) {
      generateMemoryInsights(selectedMemoryEvent);
    }
  }, [selectedMemoryEvent]);

  const generateMemoryInsights = (event: any) => {
    const arousal = Number(event.facets?.["affect.arousal"]) || 0;
    const valence = Number(event.facets?.["affect.valence"]) || 0;
    const source = event.source;
    const content = event.content || "";
    const title = event.title || "";
    const creativeInsight = Number(event.facets?.["creative_insight"]) || 0;
    const selfAwareness = Number(event.facets?.["self_awareness"]) || 0;

    let insight = "";

    // Analyze arousal patterns
    if (arousal > 0.7) {
      insight +=
        "This memory shows high arousal patterns, suggesting significant attention or emotional engagement. ";
    } else if (arousal < 0.3) {
      insight +=
        "This memory exhibits low arousal, indicating a more passive or background perception. ";
    }

    // Analyze valence
    if (valence > 0.5) {
      insight +=
        "The positive valence suggests this was a pleasant or rewarding experience. ";
    } else if (valence < -0.5) {
      insight +=
        "The negative valence indicates this was an unpleasant or aversive experience. ";
    } else {
      insight +=
        "The neutral valence suggests this was a balanced or routine experience. ";
    }

    // Analyze source-specific characteristics
    if (source === "vision") {
      const object = event.facets?.["vision.object"];
      const color = event.facets?.["color.dominant"];
      insight += `As a visual memory, this represents a moment of visual attention${
        object ? ` focused on a ${object}` : ""
      }${color ? ` with dominant ${color} coloring` : ""}. `;
    } else if (source === "speech") {
      const transcript = event.facets?.["speech.transcript"];
      const intent = event.facets?.["speech.intent"];
      insight += `This speech-based memory contains linguistic elements${
        transcript ? `: "${transcript}"` : ""
      }${intent ? ` with ${intent} intent` : ""}. `;
    } else if (source === "stm") {
      insight +=
        "This short-term memory represents a recent thought or observation that was processed by the ego system. ";
    } else if (source === "ltm") {
      insight +=
        "This long-term memory has been consolidated from multiple experiences, representing a deeper understanding. ";
    }

    // Analyze cognitive aspects
    if (creativeInsight > 0.7) {
      insight +=
        "The high creative insight score suggests this memory sparked novel connections or ideas. ";
    }

    if (selfAwareness > 0.7) {
      insight +=
        "The high self-awareness score indicates this memory involved significant introspection or self-reflection. ";
    }

    // Add content-specific insights
    if (content.includes("Nanat") || content.includes("introduction")) {
      insight +=
        "This memory centers around social interaction and identity formation, marking an important moment of human connection. ";
    }

    if (title && title.includes("Mystery")) {
      insight +=
        "The consolidated nature of this memory suggests it represents a deeper pattern or recurring theme in the AI's experience. ";
    }

    // Fallback insight
    if (!insight) {
      insight =
        "This memory, while appearing simple, may have seeded several later thoughts around perception and memory formation.";
    }

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
    const newTime = percentage * (allMemoryEvents.length * 10);
    setCurrentTime(newTime);
  };

  const handleExport = () => {
    // Export functionality
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
    <div className="h-full flex flex-col xl:flex-row gap-4 p-4">
      {/* Primary Panel - Memory Timeline & Analysis */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gradient relative">
              Memory Lab
            </h1>
            <div className="hud-element text-xs">
              {isLoading ? "Loading..." : `${allMemoryEvents.length} events`}
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
                      (currentTime / (allMemoryEvents.length * 10)) * 100
                    }%`,
                  }}
                />

                {/* Memory event markers */}
                {allMemoryEvents.map((event, index) => {
                  const arousal = Number(event.facets?.["affect.arousal"]) || 0;
                  const valence = Number(event.facets?.["affect.valence"]) || 0;
                  const position = (index / allMemoryEvents.length) * 100;
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
                      title={`Event ${index + 1}: ${
                        event.source
                      } - Arousal ${arousal.toFixed(
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
                      (currentTime / (allMemoryEvents.length * 10)) * 100
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
                <span>Events: {allMemoryEvents.length}</span>
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
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-ui-dim">
              <div className="text-center">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
                <div className="text-lg mb-2">Loading Memory Data...</div>
                <div className="text-sm">Fetching STM, LTM, and Events</div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* <div className="p-4 bg-ui-surface/50 rounded mb-4">
                <h3 className="text-sm font-medium mb-2">
                  Memory Events Summary
                </h3>
                <div className="text-xs space-y-1">
                  <div>Total Events: {allMemoryEvents.length}</div>
                  <div>
                    STM:{" "}
                    {allMemoryEvents.filter((e) => e.source === "stm").length}
                  </div>
                  <div>
                    LTM:{" "}
                    {allMemoryEvents.filter((e) => e.source === "ltm").length}
                  </div>
                  <div>
                    Vision:{" "}
                    {
                      allMemoryEvents.filter((e) => e.source === "vision")
                        .length
                    }
                  </div>
                  <div>
                    Speech:{" "}
                    {
                      allMemoryEvents.filter((e) => e.source === "speech")
                        .length
                    }
                  </div>
                  <div>
                    Selected:{" "}
                    {selectedMemoryEvent
                      ? `${
                          selectedMemoryEvent.source
                        } - ${selectedMemoryEvent.content?.substring(0, 30)}...`
                      : "None"}
                  </div>
                </div>
              </div> */}
              <MemoryAnalysisView
                memoryEvents={allMemoryEvents}
                selectedEvent={selectedMemoryEvent}
                onSelectEvent={setSelectedMemoryEvent}
              />
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Side Dock - Advanced Analysis & Insights */}
      <div className="w-96 flex flex-col h-full gap-4">
        {/* Advanced Memory Analysis Panel */}
        <div className="flex-1 min-h-0 flex flex-col">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 flex-shrink-0">
            <BarChart3 className="w-5 h-5" />
            Advanced Memory Analysis
          </h2>

          <div className="space-y-3 flex-1 overflow-y-auto pr-2 pb-4">
            {selectedMemoryEvent && selectedMemoryEvent.facets ? (
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
                          {selectedMemoryEvent.source || "unknown"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ui-dim">Type:</span>
                        <span className="text-ui-text font-medium">
                          {(selectedMemoryEvent as any).type ||
                            selectedMemoryEvent.source ||
                            "unknown"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ui-dim">Timestamp:</span>
                        <span className="text-ui-text font-medium">
                          {selectedMemoryEvent.ts
                            ? new Date(
                                selectedMemoryEvent.ts * 1000
                              ).toLocaleString()
                            : "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ui-dim">Data Available:</span>
                        <span className="text-ui-text font-medium">
                          {selectedMemoryEvent.facets ? "Yes" : "No"}
                        </span>
                      </div>
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
                    {selectedMemoryEvent.facets?.["vision.object"] && (
                      <span className="px-2 py-1 bg-ui-surface/50 rounded text-xs">
                        {selectedMemoryEvent.facets["vision.object"]}
                      </span>
                    )}
                    {selectedMemoryEvent.facets?.["color.dominant"] && (
                      <span className="px-2 py-1 bg-ui-surface/50 rounded text-xs">
                        {selectedMemoryEvent.facets["color.dominant"]}
                      </span>
                    )}
                    {selectedMemoryEvent.facets?.["speech.transcript"] && (
                      <span className="px-2 py-1 bg-ui-surface/50 rounded text-xs">
                        {selectedMemoryEvent.facets["speech.transcript"]}
                      </span>
                    )}
                    {selectedMemoryEvent.facets?.["speech.intent"] && (
                      <span className="px-2 py-1 bg-ui-surface/50 rounded text-xs">
                        {selectedMemoryEvent.facets["speech.intent"]}
                      </span>
                    )}
                    {selectedMemoryEvent.facets?.["speech.sentiment"] && (
                      <span className="px-2 py-1 bg-ui-surface/50 rounded text-xs">
                        {selectedMemoryEvent.facets["speech.sentiment"]}
                      </span>
                    )}
                    {(selectedMemoryEvent as any).content && (
                      <span className="px-2 py-1 bg-ui-surface/50 rounded text-xs">
                        {(selectedMemoryEvent as any).content
                          .split(" ")
                          .slice(0, 3)
                          .join(" ")}
                        ...
                      </span>
                    )}
                    {(selectedMemoryEvent as any).title && (
                      <span className="px-2 py-1 bg-ui-surface/50 rounded text-xs">
                        {(selectedMemoryEvent as any).title}
                      </span>
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
                          selectedMemoryEvent.facets?.["affect.valence"] || 0
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ui-dim">Arousal:</span>
                      <span className="text-ui-text font-medium">
                        {Number(
                          selectedMemoryEvent.facets?.["affect.arousal"] || 0
                        ).toFixed(2)}
                      </span>
                    </div>
                    {selectedMemoryEvent.facets?.["vision.object"] && (
                      <div className="flex items-center justify-between">
                        <span className="text-ui-dim">Object:</span>
                        <span className="text-ui-text font-medium">
                          {selectedMemoryEvent.facets["vision.object"]}
                        </span>
                      </div>
                    )}
                    {selectedMemoryEvent.facets?.["speech.intent"] && (
                      <div className="flex items-center justify-between">
                        <span className="text-ui-dim">Intent:</span>
                        <span className="text-ui-text font-medium">
                          {selectedMemoryEvent.facets["speech.intent"]}
                        </span>
                      </div>
                    )}
                    {selectedMemoryEvent.facets?.["creative_insight"] && (
                      <div className="flex items-center justify-between">
                        <span className="text-ui-dim">Creative Insight:</span>
                        <span className="text-ui-text font-medium">
                          {Number(
                            selectedMemoryEvent.facets["creative_insight"]
                          ).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {selectedMemoryEvent.facets?.["self_awareness"] && (
                      <div className="flex items-center justify-between">
                        <span className="text-ui-dim">Self Awareness:</span>
                        <span className="text-ui-text font-medium">
                          {Number(
                            selectedMemoryEvent.facets["self_awareness"]
                          ).toFixed(2)}
                        </span>
                      </div>
                    )}
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
                              selectedMemoryEvent.facets?.["affect.valence"] ||
                                0
                            ) +
                              1) *
                            50
                          }%`,
                          top: `${
                            (1 -
                              Number(
                                selectedMemoryEvent.facets?.[
                                  "affect.arousal"
                                ] || 0
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
                    {selectedMemoryEvent.facets?.["vision.object"] && (
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-yellow-400" />
                        <span className="text-ui-dim">Object:</span>
                        <span className="text-ui-text">
                          {selectedMemoryEvent.facets["vision.object"]}
                        </span>
                      </div>
                    )}
                    {selectedMemoryEvent.facets?.["color.dominant"] && (
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-blue-400" />
                        <span className="text-ui-dim">Dominant Color:</span>
                        <span className="text-ui-text">
                          {selectedMemoryEvent.facets["color.dominant"]}
                        </span>
                      </div>
                    )}
                    {selectedMemoryEvent.facets?.["speech.transcript"] && (
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-green-400" />
                        <span className="text-ui-dim">Transcript:</span>
                        <span className="text-ui-text">
                          {selectedMemoryEvent.facets["speech.transcript"]}
                        </span>
                      </div>
                    )}
                    {selectedMemoryEvent.facets?.["speech.intent"] && (
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-blue-400" />
                        <span className="text-ui-dim">Intent:</span>
                        <span className="text-ui-text">
                          {selectedMemoryEvent.facets["speech.intent"]}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-400" />
                      <span className="text-ui-dim">Source:</span>
                      <span className="text-ui-text">
                        {selectedMemoryEvent.source}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-400" />
                      <span className="text-ui-dim">Valence:</span>
                      <span className="text-ui-text">
                        {Number(
                          selectedMemoryEvent.facets?.["affect.valence"] || 0
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-purple-400" />
                      <span className="text-ui-dim">Arousal:</span>
                      <span className="text-ui-text">
                        {Number(
                          selectedMemoryEvent.facets?.["affect.arousal"] || 0
                        ).toFixed(2)}
                      </span>
                    </div>
                    {(selectedMemoryEvent as any).tags &&
                      (selectedMemoryEvent as any).tags.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-purple-400" />
                          <span className="text-ui-dim">Tags:</span>
                          <span className="text-ui-text">
                            {(selectedMemoryEvent as any).tags.join(", ")}
                          </span>
                        </div>
                      )}
                    {selectedMemoryEvent.facets?.["consolidation.themes"] && (
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-orange-400" />
                        <span className="text-ui-dim">Themes:</span>
                        <span className="text-ui-text">
                          {Array.isArray(
                            selectedMemoryEvent.facets["consolidation.themes"]
                          )
                            ? selectedMemoryEvent.facets[
                                "consolidation.themes"
                              ].join(", ")
                            : selectedMemoryEvent.facets[
                                "consolidation.themes"
                              ]}
                        </span>
                      </div>
                    )}
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
            ) : selectedMemoryEvent ? (
              <div className="h-full flex items-center justify-center text-ui-dim">
                <div className="text-center">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <div className="text-lg mb-2">Memory Selected</div>
                  <div className="text-sm">
                    This memory doesn't have analysis data available
                  </div>
                </div>
              </div>
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

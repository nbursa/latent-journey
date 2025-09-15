import { useAppStore } from "../stores/appStore";
import MemoryAnalysisView from "../components/MemoryAnalysisView";
import ProgressiveDisclosure, {
  FacetDisplay,
  RawTranscript,
} from "../components/ProgressiveDisclosure";
import { useState } from "react";
import {
  Brain,
  Clock,
  BarChart3,
  Play,
  Pause,
  RotateCcw,
  Download,
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

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleExport = () => {
    // Export functionality would be implemented here
    console.log("Exporting memory data...");
  };

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

        {/* Temporal Scrubber */}
        <div className="mb-4 flex-shrink-0">
          <div className="glass p-4">
            <div className="flex items-center gap-4 mb-3">
              <Clock className="w-4 h-4 text-ui-accent" />
              <span className="text-sm font-medium">Timeline</span>
              <div className="flex-1 h-2 bg-ui-surface rounded-full relative">
                <div
                  className="h-full bg-ui-accent rounded-full transition-all duration-300"
                  style={{ width: `${(currentTime / 100) * 100}%` }}
                />
                {/* Arousal peaks */}
                {memoryEvents.map((event, index) => {
                  const arousal = Number(event.facets["affect.arousal"]) || 0;
                  const position = (index / memoryEvents.length) * 100;
                  return (
                    <div
                      key={index}
                      className="absolute top-0 w-1 h-2 bg-ui-warn rounded-full opacity-60"
                      style={{
                        left: `${position}%`,
                        height: `${arousal * 100}%`,
                        top: `${(1 - arousal) * 100}%`,
                      }}
                    />
                  );
                })}
              </div>
              <span className="text-xs text-ui-dim font-mono">
                {Math.floor(currentTime)}s
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-ui-dim">
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

      {/* Side Dock - Analysis & Insights */}
      <div className="w-96 flex flex-col min-h-0 overflow-hidden gap-4">
        {/* Analysis Panel */}
        <div className="flex-1 min-h-0 max-h-fit overflow-hidden">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Analysis
          </h2>

          <div className="space-y-3 h-full overflow-y-auto">
            {selectedMemoryEvent ? (
              <>
                <ProgressiveDisclosure
                  title="Event Snapshot"
                  level="primary"
                  defaultExpanded={true}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ui-dim">Source:</span>
                      <span className="text-ui-text capitalize">
                        {selectedMemoryEvent.source}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ui-dim">Timestamp:</span>
                      <span className="text-ui-text font-mono text-xs">
                        {new Date(
                          selectedMemoryEvent.ts * 1000
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ui-dim">Arousal:</span>
                      <span className="text-ui-text">
                        {Number(
                          selectedMemoryEvent.facets["affect.arousal"] || 0
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ui-dim">Valence:</span>
                      <span className="text-ui-text">
                        {Number(
                          selectedMemoryEvent.facets["affect.valence"] || 0
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </ProgressiveDisclosure>

                <ProgressiveDisclosure
                  title="Semantic Facets"
                  level="secondary"
                  showExplainer={true}
                  explainerText="Structured semantic tokens extracted from raw perception"
                >
                  <FacetDisplay facets={selectedMemoryEvent.facets} />
                </ProgressiveDisclosure>

                {selectedMemoryEvent.facets["speech.transcript"] && (
                  <ProgressiveDisclosure
                    title="Transcript Analysis"
                    level="secondary"
                  >
                    <RawTranscript
                      transcript={String(
                        selectedMemoryEvent.facets["speech.transcript"]
                      )}
                    />
                  </ProgressiveDisclosure>
                )}

                <ProgressiveDisclosure
                  title="Memory Insights"
                  level="tertiary"
                  showExplainer={true}
                  explainerText="AI-generated insights about this memory event"
                >
                  <div className="space-y-2 text-sm">
                    <div className="p-2 bg-ui-surface/50 rounded border border-ui-border">
                      <div className="text-ui-accent font-medium mb-1">
                        Pattern Recognition:
                      </div>
                      <div className="text-ui-text">
                        This event shows high arousal patterns consistent with
                        visual attention.
                      </div>
                    </div>
                    <div className="p-2 bg-ui-surface/50 rounded border border-ui-border">
                      <div className="text-ui-accent font-medium mb-1">
                        Temporal Context:
                      </div>
                      <div className="text-ui-text">
                        Occurs during a period of increased cognitive load.
                      </div>
                    </div>
                  </div>
                </ProgressiveDisclosure>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-ui-dim">
                <div className="text-center">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <div className="text-lg mb-2">No selection</div>
                  <div className="text-sm">
                    Click on a memory event to analyze
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

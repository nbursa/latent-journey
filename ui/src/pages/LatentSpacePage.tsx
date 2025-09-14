import { useAppStore } from "../stores/appStore";
import LatentSpaceView from "../components/LatentSpaceView";
import LatentScatter from "../components/LatentScatter";
import WaypointComparison from "../components/WaypointComparison";
import ProgressiveDisclosure, {
  FacetDisplay,
  CLIPLogits,
  RawTranscript,
} from "../components/ProgressiveDisclosure";
import { useMemoryEventsRealtime } from "../hooks/useMemoryEventsRealtime";
import { useState } from "react";
import { Map, Eye, Brain, Settings, Camera } from "lucide-react";

export default function LatentSpacePage() {
  const memoryEvents = useAppStore((state) => state.memoryEvents);
  const selectedMemoryEvent = useAppStore((state) => state.selectedMemoryEvent);
  const setSelectedMemoryEvent = useAppStore(
    (state) => state.setSelectedMemoryEvent
  );

  const [viewMode, setViewMode] = useState<"2d" | "3d">("3d");
  const [cameraPreset, setCameraPreset] = useState<
    "top" | "isometric" | "free"
  >("free");

  // Load memory events on mount
  useMemoryEventsRealtime();

  return (
    <div className="h-full flex flex-col xl:flex-row gap-4 p-4 overflow-hidden">
      {/* Primary Panel - Latent Space Visualization */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header with Controls */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gradient relative">
              Latent Space Laboratory
            </h1>
            <div className="hud-element text-xs">
              {memoryEvents.length} points
            </div>
          </div>

          <div className="flex gap-2">
            {/* Camera Presets */}
            <div className="flex gap-1">
              <button
                onClick={() => setCameraPreset("top")}
                className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
                  cameraPreset === "top"
                    ? "bg-ui-accent text-ui-bg"
                    : "bg-ui-surface text-ui-dim hover:text-ui-text"
                }`}
                title="Top view"
              >
                <Camera className="w-3 h-3" />
                Top
              </button>
              <button
                onClick={() => setCameraPreset("isometric")}
                className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
                  cameraPreset === "isometric"
                    ? "bg-ui-accent text-ui-bg"
                    : "bg-ui-surface text-ui-dim hover:text-ui-text"
                }`}
                title="Isometric view"
              >
                <Settings className="w-3 h-3" />
                Iso
              </button>
              <button
                onClick={() => setCameraPreset("free")}
                className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
                  cameraPreset === "free"
                    ? "bg-ui-accent text-ui-bg"
                    : "bg-ui-surface text-ui-dim hover:text-ui-text"
                }`}
                title="Free orbit"
              >
                <Eye className="w-3 h-3" />
                Free
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode("2d")}
                className={`px-3 py-1 text-sm rounded flex items-center gap-2 transition-colors ${
                  viewMode === "2d"
                    ? "bg-ui-accent text-ui-bg"
                    : "bg-ui-surface text-ui-dim hover:text-ui-text"
                }`}
              >
                <Map className="w-4 h-4" />
                2D
              </button>
              <button
                onClick={() => setViewMode("3d")}
                className={`px-3 py-1 text-sm rounded flex items-center gap-2 transition-colors ${
                  viewMode === "3d"
                    ? "bg-ui-accent text-ui-bg"
                    : "bg-ui-surface text-ui-dim hover:text-ui-text"
                }`}
              >
                <Eye className="w-4 h-4" />
                3D
              </button>
            </div>
          </div>
        </div>

        {/* Visualization Area */}
        <div className="flex-1 min-h-0 overflow-hidden glass">
          {viewMode === "2d" ? (
            <LatentSpaceView
              memoryEvents={memoryEvents}
              selectedEvent={selectedMemoryEvent}
              onSelectEvent={setSelectedMemoryEvent}
            />
          ) : (
            <LatentScatter
              memoryEvents={memoryEvents}
              selectedEvent={selectedMemoryEvent}
              onSelectEvent={setSelectedMemoryEvent}
              onHoverEvent={() => {}}
            />
          )}
        </div>
      </div>

      {/* Side Dock - Inspector & Waypoints */}
      <div className="w-96 flex flex-col min-h-0 max-h-fit overflow-hidden gap-4">
        {/* Inspector Panel */}
        <div className="flex flex-col min-h-0 max-h-fit overflow-hidden">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Inspector
          </h2>

          <div className="space-y-3 min-h-0 max-h-full overflow-y-auto">
            {selectedMemoryEvent ? (
              <>
                <ProgressiveDisclosure
                  title="Event Details"
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
                  </div>
                </ProgressiveDisclosure>

                <ProgressiveDisclosure
                  title="Facets"
                  level="secondary"
                  showExplainer={true}
                  explainerText="Semantic tokens extracted from the raw perception data"
                >
                  <FacetDisplay facets={selectedMemoryEvent.facets} />
                </ProgressiveDisclosure>

                {selectedMemoryEvent.facets["speech.transcript"] && (
                  <ProgressiveDisclosure
                    title="Raw Transcript"
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
                  title="CLIP Logits"
                  level="tertiary"
                  showExplainer={true}
                  explainerText="Raw CLIP model predictions for this perception"
                >
                  <CLIPLogits
                    logits={[0.8, 0.6, 0.4, 0.2, 0.1]}
                    labels={["person", "object", "scene", "text", "other"]}
                  />
                </ProgressiveDisclosure>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-ui-dim">
                <div className="text-center">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <div className="text-lg mb-2">No selection</div>
                  <div className="text-sm">
                    Click on a point to inspect details
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Waypoints Panel */}
        <div className="flex-shrink-0">
          <WaypointComparison />
        </div>
      </div>
    </div>
  );
}

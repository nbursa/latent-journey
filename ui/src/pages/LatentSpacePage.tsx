import { useAppStore } from "../stores/appStore";
import LatentSpaceView from "../components/LatentSpaceView";
import LatentSpace3D from "../components/LatentSpace3D";
import LatentScatter from "../components/LatentScatter";
import WaypointComparison from "../components/WaypointComparison";
import VisualizationControls from "../components/VisualizationControls";
import UnifiedMiniMap from "../components/UnifiedMiniMap";
import ExplorationPanel from "../components/ExplorationPanel";
import JourneyTimeline from "../components/JourneyTimeline";
import ProgressiveDisclosure, {
  FacetDisplay,
  CLIPLogits,
  RawTranscript,
} from "../components/ProgressiveDisclosure";
import { Cluster, SemanticGroup } from "../utils/clustering";
import { MemoryEvent } from "../types";
import { useMemoryEventsRealtime } from "../hooks/useMemoryEventsRealtime";
import { useState, useMemo } from "react";
import { Map, Eye, Brain, Layers, Search } from "lucide-react";

export default function LatentSpacePage() {
  const memoryEvents = useAppStore((state) => state.memoryEvents);
  const selectedMemoryEvent = useAppStore((state) => state.selectedMemoryEvent);
  const setSelectedMemoryEvent = useAppStore(
    (state) => state.setSelectedMemoryEvent
  );

  const [viewMode, setViewMode] = useState<"2d" | "3d" | "scatter">("3d");
  const [cameraPreset, setCameraPreset] = useState<
    "top" | "isometric" | "free"
  >("free");
  const [filter, setFilter] = useState<"all" | "vision" | "speech">("all");
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<SemanticGroup | null>(
    null
  );

  // Load memory events on mount
  useMemoryEventsRealtime();

  // Filter memory events based on current filter and search
  const filteredMemoryEvents = useMemo(() => {
    let filtered = memoryEvents;

    // Apply source filter
    if (filter !== "all") {
      filtered = filtered.filter((event) => event.source === filter);
    }

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((event) => {
        const searchLower = searchQuery.toLowerCase();
        return (
          event.source.toLowerCase().includes(searchLower) ||
          Object.values(event.facets).some((value) =>
            String(value).toLowerCase().includes(searchLower)
          )
        );
      });
    }

    // Apply cluster/group selection
    if (selectedCluster) {
      filtered = filtered.filter((event) =>
        selectedCluster.points.some((point) => point.ts === event.ts)
      );
    } else if (selectedGroup) {
      filtered = filtered.filter((event) =>
        selectedGroup.events.some((groupEvent) => groupEvent.ts === event.ts)
      );
    }

    return filtered;
  }, [memoryEvents, filter, searchQuery, selectedCluster, selectedGroup]);

  // Convert memory events to 2D points for mini-map
  const miniMapPoints = useMemo(() => {
    return filteredMemoryEvents.map((event, index) => {
      // Simple 2D projection for mini-map
      const x = (index % 10) * 20 - 100; // Spread horizontally
      const y = Math.floor(index / 10) * 20 - 100; // Spread vertically

      return {
        x,
        y,
        event,
        isSelected: selectedMemoryEvent?.ts === event.ts,
        isWaypoint: false, // Could add waypoint logic here
        color: event.source === "vision" ? "#00E0BE" : "#1BB4F2",
        source: event.source,
      };
    });
  }, [filteredMemoryEvents, selectedMemoryEvent]);

  const handleFocus = (x: number, y: number) => {
    // This would be implemented by each visualization component
    console.log("Focus on:", x, y);
  };

  const handleResetView = () => {
    // Reset camera/view to default position
    console.log("Reset view");
  };

  const handleFitAll = () => {
    // Fit all points in view
    console.log("Fit all points");
  };

  const handleExplorationFilterChange = (events: MemoryEvent[]) => {
    // This could be used to update the visualization with filtered events
    console.log("Exploration filter changed:", events.length, "events");
  };

  const handleClusterSelect = (cluster: Cluster | null) => {
    setSelectedCluster(cluster);
    setSelectedGroup(null); // Clear group selection
  };

  const handleGroupSelect = (group: SemanticGroup | null) => {
    setSelectedGroup(group);
    setSelectedCluster(null); // Clear cluster selection
  };

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
            <div className="btn-secondary px-2 py-1 text-xs">
              {filteredMemoryEvents.length} / {memoryEvents.length} points
            </div>
            {searchQuery && (
              <div className="btn-accent px-2 py-1 text-xs">
                Filtered: "{searchQuery}"
              </div>
            )}
            {selectedCluster && (
              <div className="btn-primary px-2 py-1 text-xs">
                Cluster: {selectedCluster.label}
              </div>
            )}
            {selectedGroup && (
              <div className="btn-primary px-2 py-1 text-xs">
                Group: {selectedGroup.name}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-ui-dim" />
              <input
                type="text"
                placeholder="Search memories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs bg-ui-surface border border-ui-border rounded focus:outline-none focus:border-ui-accent w-40"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode("2d")}
                className={`px-2 py-1 text-xs flat flex items-center gap-1 ${
                  viewMode === "2d" ? "btn-primary nav-active" : "btn-secondary"
                }`}
                title="2D Map View"
              >
                <Map className="w-3 h-3" />
                2D
              </button>
              <button
                onClick={() => setViewMode("3d")}
                className={`px-2 py-1 text-xs flat flex items-center gap-1 ${
                  viewMode === "3d" ? "btn-primary nav-active" : "btn-secondary"
                }`}
                title="3D Space View"
              >
                <Eye className="w-3 h-3" />
                3D
              </button>
              <button
                onClick={() => setViewMode("scatter")}
                className={`px-2 py-1 text-xs flat flex items-center gap-1 ${
                  viewMode === "scatter"
                    ? "btn-primary nav-active"
                    : "btn-secondary"
                }`}
                title="3D Scatter Plot"
              >
                <Layers className="w-3 h-3" />
                Scatter
              </button>
            </div>
          </div>
        </div>

        {/* Visualization Area */}
        <div className="flex-1 min-h-0 overflow-hidden glass relative">
          {/* Unified Controls */}
          <VisualizationControls
            onFilterChange={setFilter}
            onCameraPresetChange={setCameraPreset}
            onToggleTrajectory={() => setShowTrajectory(!showTrajectory)}
            onResetView={handleResetView}
            onFitAll={handleFitAll}
            showTrajectory={showTrajectory}
            currentFilter={filter}
            currentPreset={cameraPreset}
            pointCount={filteredMemoryEvents.length}
          />

          {/* Unified Mini Map */}
          <UnifiedMiniMap
            points={miniMapPoints}
            onFocus={handleFocus}
            onSelectEvent={setSelectedMemoryEvent}
            selectedEvent={selectedMemoryEvent}
            showTrajectory={showTrajectory}
            onToggleTrajectory={() => setShowTrajectory(!showTrajectory)}
          />

          {/* Visualization Components */}
          {viewMode === "2d" ? (
            <LatentSpaceView
              memoryEvents={filteredMemoryEvents}
              selectedEvent={selectedMemoryEvent}
              onSelectEvent={setSelectedMemoryEvent}
            />
          ) : viewMode === "3d" ? (
            <LatentSpace3D
              key="latent-space-3d"
              memoryEvents={filteredMemoryEvents}
              selectedEvent={selectedMemoryEvent}
              onSelectEvent={setSelectedMemoryEvent}
              cameraPreset={cameraPreset}
              selectedCluster={selectedCluster}
              selectedGroup={selectedGroup}
            />
          ) : (
            <LatentScatter
              memoryEvents={filteredMemoryEvents}
              selectedEvent={selectedMemoryEvent}
              onSelectEvent={setSelectedMemoryEvent}
              onHoverEvent={() => {}}
              cameraPreset={cameraPreset}
            />
          )}
        </div>
      </div>

      {/* Side Dock - Exploration, Inspector & Waypoints */}
      <div className="w-96 flex flex-col min-h-0 max-h-fit overflow-y-auto gap-4">
        {/* Exploration Panel */}
        <ExplorationPanel
          memoryEvents={memoryEvents}
          onFilterChange={handleExplorationFilterChange}
          onClusterSelect={handleClusterSelect}
          onGroupSelect={handleGroupSelect}
          selectedCluster={selectedCluster}
          selectedGroup={selectedGroup}
        />

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

        {/* Journey Timeline */}
        <JourneyTimeline
          memoryEvents={memoryEvents}
          selectedEvent={selectedMemoryEvent}
          onSelectEvent={setSelectedMemoryEvent}
        />

        {/* Waypoints Panel */}
        <div className="flex-shrink-0">
          <WaypointComparison />
        </div>
      </div>
    </div>
  );
}

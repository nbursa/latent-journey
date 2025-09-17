import { useAppStore } from "../stores/appStore";
import LatentSpaceView from "../components/LatentSpace2D";
import LatentSpace3D from "../components/LatentSpace3D";
import LatentScatter from "../components/LatentScatter3D";
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
import { useState, useMemo, useEffect } from "react";
import { Map, Eye, Brain, Layers, Search } from "lucide-react";

export default function LatentSpacePage() {
  const selectedMemoryEvent = useAppStore((state) => state.selectedMemoryEvent);
  const setSelectedMemoryEvent = useAppStore(
    (state) => state.setSelectedMemoryEvent
  );

  const [viewMode, setViewMode] = useState<"2d" | "3d" | "scatter">("3d");
  const [cameraPreset, setCameraPreset] = useState<
    "top" | "isometric" | "free"
  >("free");
  const [filter, setFilter] = useState<
    "all" | "vision" | "speech" | "stm" | "ltm"
  >("all");
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<SemanticGroup | null>(
    null
  );
  const [stmData, setStmData] = useState<any[]>([]);
  const [ltmData, setLtmData] = useState<any[]>([]);
  const [eventsData, setEventsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Combine all memory data into a unified timeline
  const allMemoryEvents = useMemo(() => {
    const events = [
      // STM data - text-based thoughts with facets
      ...stmData.map((item) => ({
        ...item,
        source: "stm",
        type: "short_term",
        ts: item.ts || Date.now() / 1000, // Use existing ts field
        content: item.content,
        facets: item.facets || {},
        tags: item.tags || [],
        embedding_id: item.embedding_id,
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
          "consolidation.title": item.title || "",
        },
        tags: item.tags || [],
        title: item.title,
        summary: item.summary,
        embedding_id: item.id,
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
    console.log("Combined memory events for latent space:", sortedEvents);
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
          console.log("Loaded STM data for latent space:", stmData);
          setStmData(stmData);
        }

        // Load LTM data from API
        const ltmResponse = await fetch("/api/ego/experiences");
        if (ltmResponse.ok) {
          const ltmResult = await ltmResponse.json();
          const ltmData = ltmResult.data || [];
          console.log("Loaded LTM data for latent space:", ltmData);
          setLtmData(ltmData);
        }

        // Load events data from API
        const eventsResponse = await fetch("/api/memory");
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          console.log("Loaded Events data for latent space:", eventsData);
          setEventsData(eventsData);
        }
      } catch (error) {
        console.error("Error loading memory data for latent space:", error);
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

  const filteredMemoryEvents = useMemo(() => {
    let filtered = allMemoryEvents;

    if (filter !== "all") {
      filtered = filtered.filter((event) => event.source === filter);
    }

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
  }, [allMemoryEvents, filter, searchQuery, selectedCluster, selectedGroup]);

  // Convert memory events to 2D points for mini-map
  const miniMapPoints = useMemo(() => {
    return filteredMemoryEvents.map((event, index) => {
      const x = (index % 10) * 20 - 100; // Spread horizontally
      const y = Math.floor(index / 10) * 20 - 100; // Spread vertically

      return {
        x,
        y,
        event,
        isSelected: selectedMemoryEvent?.ts === event.ts,
        isWaypoint: false,
        color: event.source === "vision" ? "#00E0BE" : "#1BB4F2",
        source: event.source,
      };
    });
  }, [filteredMemoryEvents, selectedMemoryEvent]);

  const handleFocus = (x: number, y: number) => {
    console.log("Focus on:", x, y);
  };

  const handleResetView = () => {
    console.log("Reset view");
  };

  const handleFitAll = () => {
    console.log("Fit all points");
  };

  const handleExplorationFilterChange = (events: MemoryEvent[]) => {
    console.log("Exploration filter changed:", events.length, "events");
  };

  const handleClusterSelect = (cluster: Cluster | null) => {
    setSelectedCluster(cluster);
    setSelectedGroup(null);
  };

  const handleGroupSelect = (group: SemanticGroup | null) => {
    setSelectedGroup(group);
    setSelectedCluster(null);
  };

  return (
    <div className="h-full flex flex-col xl:flex-row gap-4 p-4 overflow-hidden">
      {/* Primary Panel - Latent Space Visualization */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header with Controls */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gradient relative">
              Latent Space Laboratory
            </h1>
            <div className="btn-secondary px-2 py-1 text-xs">
              {isLoading
                ? "Loading..."
                : `${filteredMemoryEvents.length} / ${allMemoryEvents.length} points`}
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
                className="pl-8 pr-3 py-1 text-xs bg-ui-surface border border-zinc-700 focus:outline-none focus:border-zinc-500 w-40"
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
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-ui-dim">
              <div className="text-center">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50 animate-pulse" />
                <div className="text-lg mb-2">Loading Latent Space Data...</div>
                <div className="text-sm">Fetching STM, LTM, and Events</div>
              </div>
            </div>
          ) : (
            <>
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
              />

              {/* Visualization Components */}
              {viewMode === "2d" ? (
                <LatentSpaceView
                  memoryEvents={filteredMemoryEvents}
                  selectedEvent={selectedMemoryEvent}
                  onSelectEvent={setSelectedMemoryEvent}
                  showTrajectory={showTrajectory}
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
            </>
          )}
        </div>
      </div>

      {/* Side Dock - Exploration, Inspector & Waypoints */}
      <div className="w-96 flex flex-col min-h-0 max-h-fit overflow-y-auto gap-4">
        {/* Exploration Panel */}
        <ExplorationPanel
          memoryEvents={allMemoryEvents}
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
          memoryEvents={allMemoryEvents}
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

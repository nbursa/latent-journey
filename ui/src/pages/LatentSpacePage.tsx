import { useAppStore } from "../stores/appStore";
import LatentSpaceView from "../components/LatentSpace2D";
import LatentSpace3D from "../components/LatentSpace3D";
import LatentScatter3D from "../components/LatentScatter3D";
import WaypointComparison from "../components/WaypointComparison";
import VisualizationControls from "../components/VisualizationControls";
import ExplorationPanel, {
  ExplorationPanelRef,
} from "../components/ExplorationPanel";
import JourneyTimeline from "../components/JourneyTimeline";
import ProgressiveDisclosure, {
  FacetDisplay,
  CLIPLogits,
  RawTranscript,
} from "../components/ProgressiveDisclosure";
import { Cluster, SemanticGroup } from "../utils/clustering";
import { MemoryEvent } from "../types";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Map, Eye, Brain, Layers } from "lucide-react";

export default function LatentSpacePage() {
  const selectedMemoryEvent = useAppStore((state) => state.selectedMemoryEvent);
  const setSelectedMemoryEvent = useAppStore(
    (state) => state.setSelectedMemoryEvent
  );

  // UI State
  const [viewMode, setViewMode] = useState<"2d" | "3d" | "scatter">("3d");
  const [cameraPreset, setCameraPreset] = useState<
    "top" | "isometric" | "free"
  >("free");
  const [showTrajectory, setShowTrajectory] = useState(true);

  // Data State
  const [stmData, setStmData] = useState<any[]>([]);
  const [ltmData, setLtmData] = useState<any[]>([]);
  const [eventsData, setEventsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtering State - SINGLE SOURCE OF TRUTH
  const [displayedEvents, setDisplayedEvents] = useState<MemoryEvent[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<SemanticGroup | null>(
    null
  );

  // Refs
  const explorationPanelRef = useRef<ExplorationPanelRef>(null);

  // Stable callbacks to prevent child re-renders
  const handleHoverEvent = useCallback((_event: MemoryEvent | null) => {
    // No-op for now, but stable reference
  }, []);

  // Combine all memory data into a unified timeline - SINGLE SOURCE OF TRUTH
  const allMemoryEvents = useMemo(() => {
    const events = [
      // STM data - text-based thoughts with facets
      ...stmData.map((item) => ({
        ...item,
        source: "stm",
        type: "short_term",
        ts: item.ts || Date.now() / 1000,
        content: item.content,
        facets: item.facets || {},
        tags: item.tags || [],
        embedding_id: item.embedding_id,
        embedding: item.embedding || [],
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
        embedding: item.embedding || [],
      })),
      // Events data - perception events (vision, speech)
      ...eventsData.map((item) => ({
        ...item,
        source: item.source || "event",
        type: "perception",
        ts: item.ts || Date.now() / 1000,
        facets: item.facets || {},
        embedding_id: item.embedding_id,
        embedding: item.embedding || [],
      })),
    ];

    return events.sort((a, b) => a.ts - b.ts);
  }, [stmData, ltmData, eventsData]);

  // Load data
  useEffect(() => {
    const loadMemoryData = async () => {
      setIsLoading(true);
      try {
        const [stmResponse, ltmResponse, eventsResponse] = await Promise.all([
          fetch("/api/ego/memories"),
          fetch("/api/ego/experiences"),
          fetch("/api/memory"),
        ]);

        if (stmResponse.ok) {
          const stmResult = await stmResponse.json();
          setStmData(stmResult.data || []);
        }

        if (ltmResponse.ok) {
          const ltmResult = await ltmResponse.json();
          setLtmData(ltmResult.data || []);
        }

        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          setEventsData(eventsData);
        }
      } catch (error) {
        console.error("Error loading memory data:", error);
        setStmData([]);
        setLtmData([]);
        setEventsData([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMemoryData();
  }, []);

  // Initialize displayed events when data loads
  useEffect(() => {
    setDisplayedEvents(allMemoryEvents);
  }, [allMemoryEvents]);

  // Apply cluster/group filtering to displayed events
  const finalEvents = useMemo(() => {
    let events = displayedEvents;
    console.log("🔍 Computing finalEvents:", {
      displayedEventsCount: displayedEvents.length,
      selectedCluster: selectedCluster?.id,
      selectedGroup: selectedGroup?.id,
    });

    if (selectedCluster) {
      const clusterEventTimestamps = new Set(
        selectedCluster.points.map((p) => p.ts)
      );
      const beforeCount = events.length;
      events = events.filter((event) => clusterEventTimestamps.has(event.ts));
      console.log("🔍 Cluster filtering applied:", {
        originalCount: displayedEvents.length,
        beforeFilter: beforeCount,
        filteredCount: events.length,
        clusterId: selectedCluster.id,
        clusterPoints: selectedCluster.points.length,
        clusterTimestamps: Array.from(clusterEventTimestamps).slice(0, 5),
      });
    }

    if (selectedGroup) {
      const groupEventTimestamps = new Set(
        selectedGroup.events.map((e) => e.ts)
      );
      const beforeCount = events.length;
      events = events.filter((event) => groupEventTimestamps.has(event.ts));
      console.log("🔍 Group filtering applied:", {
        originalCount: displayedEvents.length,
        beforeFilter: beforeCount,
        filteredCount: events.length,
        groupId: selectedGroup.id,
        groupEvents: selectedGroup.events.length,
        groupTimestamps: Array.from(groupEventTimestamps).slice(0, 5),
      });
    }

    console.log("🔍 Final events count:", events.length);
    return events;
  }, [displayedEvents, selectedCluster, selectedGroup]);

  // Event handlers - CLEAN AND SIMPLE
  const handleExplorationFilterChange = useCallback((events: MemoryEvent[]) => {
    setDisplayedEvents(events);
  }, []);

  const handleClusterSelect = useCallback((cluster: Cluster | null) => {
    setSelectedCluster(cluster);
    setSelectedGroup(null);
  }, []);

  const handleGroupSelect = useCallback((group: SemanticGroup | null) => {
    setSelectedGroup(group);
    setSelectedCluster(null);
  }, []);

  const handleResetView = useCallback(() => {
    setCameraPreset("free");
    setSelectedCluster(null);
    setSelectedGroup(null);
    explorationPanelRef.current?.reset();
  }, []);

  const handleFitAll = useCallback(() => {
    setCameraPreset("free");
    setSelectedCluster(null);
    setSelectedGroup(null);
    explorationPanelRef.current?.reset();
  }, []);

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
                : `${finalEvents.length} / ${allMemoryEvents.length} points`}
            </div>
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
              {/* Visualization Controls */}
              <VisualizationControls
                onCameraPresetChange={setCameraPreset}
                onToggleTrajectory={() => setShowTrajectory(!showTrajectory)}
                onResetView={handleResetView}
                onFitAll={handleFitAll}
                showTrajectory={showTrajectory}
                currentPreset={cameraPreset}
                pointCount={finalEvents.length}
              />

              {/* Visualization Components - NO DYNAMIC KEYS */}
              {viewMode === "2d" ? (
                <LatentSpaceView
                  memoryEvents={finalEvents}
                  selectedEvent={selectedMemoryEvent}
                  onSelectEvent={setSelectedMemoryEvent}
                  showTrajectory={showTrajectory}
                />
              ) : viewMode === "3d" ? (
                <LatentSpace3D
                  memoryEvents={finalEvents}
                  selectedEvent={selectedMemoryEvent}
                  onSelectEvent={setSelectedMemoryEvent}
                  showTrajectory={showTrajectory}
                  cameraPreset={cameraPreset}
                />
              ) : (
                <LatentScatter3D
                  memoryEvents={finalEvents}
                  selectedEvent={selectedMemoryEvent}
                  onSelectEvent={setSelectedMemoryEvent}
                  onHoverEvent={handleHoverEvent}
                  cameraPreset={cameraPreset}
                  showTrajectory={showTrajectory}
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
          ref={explorationPanelRef}
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
          memoryEvents={finalEvents}
          selectedEvent={selectedMemoryEvent}
          onSelectEvent={setSelectedMemoryEvent}
        />

        {/* Waypoints Panel */}
        <div className="flex-shrink-0">
          <WaypointComparison
            memoryEvents={finalEvents}
            selectedEvent={selectedMemoryEvent}
            onSelectEvent={setSelectedMemoryEvent}
          />
        </div>
      </div>
    </div>
  );
}

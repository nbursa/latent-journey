import { useState, useMemo } from "react";
import { MemoryEvent } from "../types";
import {
  Cluster,
  SemanticGroup,
  clusterEmbeddings,
  createSemanticGroups,
  searchEvents,
  filterEventsBySource,
  sortEventsByTime,
  sortEventsByConfidence,
} from "../utils/clustering";
import {
  Search,
  Filter,
  Layers,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface ExplorationPanelProps {
  memoryEvents: MemoryEvent[];
  onFilterChange: (events: MemoryEvent[]) => void;
  onClusterSelect: (cluster: Cluster | null) => void;
  onGroupSelect: (group: SemanticGroup | null) => void;
  selectedCluster: Cluster | null;
  selectedGroup: SemanticGroup | null;
  className?: string;
}

export default function ExplorationPanel({
  memoryEvents,
  onFilterChange,
  onClusterSelect,
  onGroupSelect,
  selectedCluster,
  selectedGroup,
  className = "",
}: ExplorationPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "vision" | "speech">(
    "all"
  );
  const [sortBy, setSortBy] = useState<"time" | "confidence">("time");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showClusters, setShowClusters] = useState(true);
  const [showGroups, setShowGroups] = useState(true);
  const [clusterCount, setClusterCount] = useState(5);

  // Generate clusters and groups
  const clusters = useMemo(() => {
    return clusterEmbeddings(memoryEvents, clusterCount);
  }, [memoryEvents, clusterCount]);

  const semanticGroups = useMemo(() => {
    return createSemanticGroups(memoryEvents);
  }, [memoryEvents]);

  // Apply filters and search
  const filteredEvents = useMemo(() => {
    let filtered = memoryEvents;

    // Apply source filter
    filtered = filterEventsBySource(filtered, sourceFilter);

    // Apply search
    filtered = searchEvents(filtered, searchQuery);

    // Apply sorting
    if (sortBy === "time") {
      filtered = sortEventsByTime(filtered, sortOrder === "asc");
    } else if (sortBy === "confidence") {
      filtered = sortEventsByConfidence(filtered, sortOrder === "asc");
    }

    return filtered;
  }, [memoryEvents, sourceFilter, searchQuery, sortBy, sortOrder]);

  // Update parent with filtered events
  useMemo(() => {
    onFilterChange(filteredEvents);
  }, [filteredEvents, onFilterChange]);

  const handleClusterClick = (cluster: Cluster) => {
    if (selectedCluster?.id === cluster.id) {
      onClusterSelect(null);
    } else {
      onClusterSelect(cluster);
      onGroupSelect(null); // Clear group selection
    }
  };

  const handleGroupClick = (group: SemanticGroup) => {
    if (selectedGroup?.id === group.id) {
      onGroupSelect(null);
    } else {
      onGroupSelect(group);
      onClusterSelect(null); // Clear cluster selection
    }
  };

  return (
    <div className={`glass flat p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-ui-accent">Exploration</h3>
        <div className="text-xs text-ui-dim">
          {filteredEvents.length} / {memoryEvents.length} events
        </div>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-ui-text">Search</label>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-ui-dim" />
          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs bg-ui-surface border border-zinc-700 focus:outline-none focus:border-zinc-500"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-ui-text">Filters</label>
        <div className="space-y-2">
          {/* Source Filter */}
          <div>
            <div className="text-xs text-ui-dim mb-1">Source</div>
            <div className="flex gap-1">
              {["all", "vision", "speech"].map((source) => (
                <button
                  key={source}
                  onClick={() => setSourceFilter(source as any)}
                  className={`px-2 py-1 text-xs flat ${
                    sourceFilter === source ? "btn-primary" : "btn-secondary"
                  }`}
                >
                  {source}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <div className="text-xs text-ui-dim mb-1">Sort by</div>
            <div className="flex gap-1">
              <button
                onClick={() => setSortBy("time")}
                className={`px-2 py-1 text-xs flat flex items-center gap-1 ${
                  sortBy === "time" ? "btn-primary" : "btn-secondary"
                }`}
              >
                <Clock className="w-3 h-3" />
                Time
              </button>
              <button
                onClick={() => setSortBy("confidence")}
                className={`px-2 py-1 text-xs flat flex items-center gap-1 ${
                  sortBy === "confidence" ? "btn-primary" : "btn-secondary"
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                Confidence
              </button>
              <button
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="px-2 py-1 text-xs flat btn-secondary"
                title={`Sort ${
                  sortOrder === "asc" ? "descending" : "ascending"
                }`}
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Clusters */}
      <div className="space-y-2">
        <button
          onClick={() => setShowClusters(!showClusters)}
          className="flex items-center justify-between w-full text-xs font-medium text-ui-text hover:text-ui-accent transition-colors"
        >
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" />
            Clusters ({clusters.length})
          </span>
          {showClusters ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>

        {showClusters && (
          <div className="space-y-1">
            {/* Cluster count control */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-ui-dim">Count:</label>
              <input
                type="range"
                min="2"
                max="10"
                value={clusterCount}
                onChange={(e) => setClusterCount(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-ui-dim w-6">{clusterCount}</span>
            </div>

            {/* Cluster list */}
            {clusters.map((cluster) => (
              <button
                key={cluster.id}
                onClick={() => handleClusterClick(cluster)}
                className={`w-full text-left p-2 flat ${
                  selectedCluster?.id === cluster.id
                    ? "btn-primary"
                    : "btn-secondary"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cluster.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">
                      {cluster.label}
                    </div>
                    <div className="text-xs text-ui-dim">
                      {cluster.size} points
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Semantic Groups */}
      <div className="space-y-2">
        <button
          onClick={() => setShowGroups(!showGroups)}
          className="flex items-center justify-between w-full text-xs font-medium text-ui-text hover:text-ui-accent transition-colors"
        >
          <span className="flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Groups ({semanticGroups.length})
          </span>
          {showGroups ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>

        {showGroups && (
          <div className="space-y-1">
            {semanticGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => handleGroupClick(group)}
                className={`w-full text-left p-2 flat ${
                  selectedGroup?.id === group.id
                    ? "btn-primary"
                    : "btn-secondary"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">
                      {group.name}
                    </div>
                    <div className="text-xs text-ui-dim">
                      {group.events.length} events
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-ui-text">Quick Actions</div>
        <div className="flex gap-1">
          <button
            onClick={() => {
              onClusterSelect(null);
              onGroupSelect(null);
            }}
            className="px-2 py-1 text-xs btn-secondary"
          >
            Clear All
          </button>
          <button
            onClick={() => {
              setSearchQuery("");
              setSourceFilter("all");
            }}
            className="px-2 py-1 text-xs btn-secondary"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
}

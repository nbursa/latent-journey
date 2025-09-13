import { MemoryEvent, MemoryFilter } from "../types";
import {
  Brain,
  Mic,
  Eye,
  Clock,
  Sparkles,
  Filter,
  Bookmark,
} from "lucide-react";
import { useWaypoints, useWaypointActions } from "../stores/appStore";

interface MemoryTimelineProps {
  memoryEvents: MemoryEvent[];
  memoryFilter: MemoryFilter;
  selectedMemoryEvent: MemoryEvent | null;
  onSetMemoryFilter: (filter: MemoryFilter) => void;
  onSelectMemoryEvent: (event: MemoryEvent) => void;
}

export default function MemoryTimeline({
  memoryEvents,
  memoryFilter,
  selectedMemoryEvent,
  onSetMemoryFilter,
  onSelectMemoryEvent,
}: MemoryTimelineProps) {
  const waypoints = useWaypoints();
  const { toggleWaypoint, setWaypointA, setWaypointB } = useWaypointActions();
  const filterButtons: { key: MemoryFilter; label: string; icon: any }[] = [
    { key: "all", label: "All", icon: Filter },
    { key: "speech", label: "Speech", icon: Mic },
    { key: "vision", label: "Vision", icon: Eye },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 max-h-full">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Memory
        </h2>
        <div className="flex gap-1">
          {filterButtons.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => onSetMemoryFilter(key)}
              className={`px-2 py-1 text-xs flat flex items-center gap-1 ${
                memoryFilter === key ? "btn-primary" : "btn-secondary"
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="glass flat p-3 flex-1 overflow-y-auto min-h-0 max-h-full">
        {memoryEvents.length === 0 ? (
          <div className="text-gray-400 text-sm">No memory events yet...</div>
        ) : (
          <div className="space-y-2">
            {memoryEvents
              .filter(
                (event) =>
                  memoryFilter === "all" || event.source === memoryFilter
              )
              .map((event, index) => (
                <div
                  key={index}
                  onClick={() => onSelectMemoryEvent(event)}
                  className={`p-2 border border-white/10 cursor-pointer hover:bg-white/5 transition-colors ${
                    selectedMemoryEvent?.ts === event.ts
                      ? "bg-blue-500/20 border-blue-400"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-300 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(event.ts * 1000).toLocaleTimeString()}
                      </span>
                      {index < 1 && (
                        <span className="text-xs bg-orange-500/20 text-orange-300 px-1 py-0.5 rounded flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          NEW
                        </span>
                      )}
                      {waypoints.has(event.ts) && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-300 px-1 py-0.5 rounded flex items-center gap-1">
                          <Bookmark className="w-3 h-3" />
                          WAYPOINT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-xs px-2 py-1 ${
                          event.source === "speech"
                            ? "bg-green-500/20 text-green-300"
                            : "bg-blue-500/20 text-blue-300"
                        }`}
                      >
                        {event.source}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWaypoint(event.ts);
                          }}
                          className={`p-1 rounded transition-colors ${
                            waypoints.has(event.ts)
                              ? "bg-yellow-500/20 text-yellow-300"
                              : "text-gray-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                          }`}
                          title="Toggle waypoint"
                        >
                          <Bookmark className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setWaypointA(event);
                          }}
                          className="p-1 rounded text-gray-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
                          title="Set as Waypoint A"
                        >
                          A
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setWaypointB(event);
                          }}
                          className="p-1 rounded text-gray-400 hover:text-green-300 hover:bg-green-500/10 transition-colors"
                          title="Set as Waypoint B"
                        >
                          B
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mb-1">
                    {event.embedding_id}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Object.keys(event.facets).length} facets
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

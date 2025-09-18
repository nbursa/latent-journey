import { MemoryEvent } from "../types";
import {
  useWaypointA,
  useWaypointB,
  useWaypointActions,
} from "../stores/appStore";
import { Bookmark, X, GitCompare } from "lucide-react";

interface WaypointComparisonProps {
  memoryEvents: MemoryEvent[];
  selectedEvent: MemoryEvent | null;
  onSelectEvent: (event: MemoryEvent) => void;
}

export default function WaypointComparison({
  memoryEvents,
  selectedEvent,
  onSelectEvent,
}: WaypointComparisonProps) {
  const waypointA = useWaypointA();
  const waypointB = useWaypointB();
  const { setWaypointA, setWaypointB } = useWaypointActions();

  const handleSetWaypointA = (event: MemoryEvent) => {
    setWaypointA(event);
  };

  const handleSetWaypointB = (event: MemoryEvent) => {
    setWaypointB(event);
  };

  const clearWaypointA = () => {
    setWaypointA(null);
  };

  const clearWaypointB = () => {
    setWaypointB(null);
  };

  const renderWaypoint = (
    waypoint: MemoryEvent | null,
    label: string,
    _onSet: (event: MemoryEvent) => void,
    onClear: () => void,
    color: string
  ) => (
    <div className="w-1/2 min-w-0 flex flex-col">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <h3 className="text-sm font-medium text-gray-300 truncate">{label}</h3>
        {waypoint && (
          <button
            onClick={onClear}
            className="text-gray-400 hover:text-white transition-colors flex-shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {waypoint ? (
        <div
          className={`p-3 rounded-lg border-2 ${color} bg-gray-800/50 cursor-pointer hover:bg-gray-700/50 transition-colors`}
          onClick={() => onSelectEvent(waypoint)}
        >
          <div className="text-xs text-gray-400 mb-2 truncate">
            {new Date(waypoint.ts * 1000).toLocaleString()}
          </div>
          <div className="text-sm font-medium mb-2 capitalize truncate">
            {waypoint.source}
          </div>
          <div className="space-y-1">
            {Object.entries(waypoint.facets).map(([key, value]) => (
              <div key={key} className="text-xs break-words">
                <span className="text-gray-400 break-all">{key}:</span>{" "}
                <span className="text-white break-all">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-lg border-2 border-dashed border-gray-600 bg-gray-800/30 flex items-center justify-center">
          <div className="text-center text-gray-400 text-sm break-words">
            Click a memory event to set as {label.toLowerCase()}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <GitCompare className="w-5 h-5" />
        <h2 className="text-lg font-semibold">A/B Comparison</h2>
      </div>

      <div className="glass flat p-4">
        <div className="flex gap-4">
          {renderWaypoint(
            waypointA,
            "Waypoint A",
            handleSetWaypointA,
            clearWaypointA,
            "border-blue-500"
          )}

          <div className="w-px bg-gray-600 flex-shrink-0"></div>

          {renderWaypoint(
            waypointB,
            "Waypoint B",
            handleSetWaypointB,
            clearWaypointB,
            "border-green-500"
          )}
        </div>

        {waypointA && waypointB && (
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-300 mb-2 truncate">
              Comparison
            </h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="min-w-0">
                <div className="text-gray-400 mb-1 truncate">
                  Time Difference
                </div>
                <div className="text-white break-words">
                  {Math.abs(waypointA.ts - waypointB.ts)} seconds
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-gray-400 mb-1 truncate">Source Types</div>
                <div className="text-white break-words">
                  {waypointA.source} vs {waypointB.source}
                </div>
              </div>
              <div className="col-span-2 min-w-0">
                <div className="text-gray-400 mb-1 truncate">Common Facets</div>
                <div className="text-white break-words">
                  {(() => {
                    const facetsA = Object.keys(waypointA.facets);
                    const facetsB = Object.keys(waypointB.facets);
                    const common = facetsA.filter((f) => facetsB.includes(f));
                    return common.length > 0 ? common.join(", ") : "None";
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {!waypointA && !waypointB && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center text-gray-400">
              <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <div className="text-lg mb-2">No waypoints selected</div>
              <div className="text-sm mb-4">
                {memoryEvents.length > 0
                  ? `Select from ${memoryEvents.length} available events`
                  : "No memory events available"}
              </div>
              {selectedEvent && (
                <div className="space-y-2">
                  <button
                    onClick={() => handleSetWaypointA(selectedEvent)}
                    className="px-3 py-1 text-xs btn-primary"
                  >
                    Set as Waypoint A
                  </button>
                  <button
                    onClick={() => handleSetWaypointB(selectedEvent)}
                    className="px-3 py-1 text-xs btn-secondary ml-2"
                  >
                    Set as Waypoint B
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

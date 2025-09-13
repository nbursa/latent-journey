import { MemoryEvent } from "../types";
import {
  useWaypointA,
  useWaypointB,
  useWaypointActions,
} from "../stores/appStore";
import { Bookmark, X, GitCompare } from "lucide-react";

export default function WaypointComparison() {
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
    <div className="flex-1">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-300">{label}</h3>
        {waypoint && (
          <button
            onClick={onClear}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {waypoint ? (
        <div className={`p-3 rounded-lg border-2 ${color} bg-gray-800/50`}>
          <div className="text-xs text-gray-400 mb-2">
            {new Date(waypoint.ts * 1000).toLocaleString()}
          </div>
          <div className="text-sm font-medium mb-2 capitalize">
            {waypoint.source}
          </div>
          <div className="space-y-1">
            {Object.entries(waypoint.facets).map(([key, value]) => (
              <div key={key} className="text-xs">
                <span className="text-gray-400">{key}:</span>{" "}
                <span className="text-white">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-lg border-2 border-dashed border-gray-600 bg-gray-800/30">
          <div className="text-center text-gray-400 text-sm">
            Click a memory event to set as {label.toLowerCase()}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <GitCompare className="w-5 h-5" />
        <h2 className="text-lg font-semibold">A/B Comparison</h2>
      </div>

      <div className="flex-1 glass flat p-4 min-h-0 overflow-hidden">
        <div className="flex gap-4 h-full min-h-0">
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
          <div className="mt-4 p-3 bg-gray-800/50 rounded-lg flex-shrink-0">
            <h4 className="text-sm font-medium text-gray-300 mb-2">
              Comparison
            </h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-gray-400 mb-1">Time Difference</div>
                <div className="text-white">
                  {Math.abs(waypointA.ts - waypointB.ts)} seconds
                </div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">Source Types</div>
                <div className="text-white">
                  {waypointA.source} vs {waypointB.source}
                </div>
              </div>
              <div className="col-span-2">
                <div className="text-gray-400 mb-1">Common Facets</div>
                <div className="text-white">
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
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <div className="text-lg mb-2">No waypoints selected</div>
              <div className="text-sm">
                Click memory events in the timeline to set waypoints for
                comparison
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

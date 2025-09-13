import { useAppStore } from "../stores/appStore";
import LatentSpaceView from "../components/LatentSpaceView";
import LatentSpace3D from "../components/LatentSpace3D";
import WaypointComparison from "../components/WaypointComparison";
import { useMemoryEventsRealtime } from "../hooks/useMemoryEventsRealtime";
import { useState } from "react";
import { Map, Eye } from "lucide-react";

export default function LatentSpacePage() {
  const memoryEvents = useAppStore((state) => state.memoryEvents);
  const selectedMemoryEvent = useAppStore((state) => state.selectedMemoryEvent);
  const setSelectedMemoryEvent = useAppStore(
    (state) => state.setSelectedMemoryEvent
  );

  const [viewMode, setViewMode] = useState<"2d" | "3d">("3d");

  // Load memory events on mount
  useMemoryEventsRealtime();

  return (
    <div className="h-full flex flex-col xl:flex-row gap-4 p-4 overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* View Mode Toggle */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h1 className="text-xl font-bold text-gradient">
            Latent Space Exploration
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("2d")}
              className={`px-3 py-1 text-sm rounded flex items-center gap-2 transition-colors ${
                viewMode === "2d"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <Map className="w-4 h-4" />
              2D Map
            </button>
            <button
              onClick={() => setViewMode("3d")}
              className={`px-3 py-1 text-sm rounded flex items-center gap-2 transition-colors ${
                viewMode === "3d"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              <Eye className="w-4 h-4" />
              3D Space
            </button>
          </div>
        </div>

        {/* Visualization Area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {viewMode === "2d" ? (
            <LatentSpaceView
              memoryEvents={memoryEvents}
              selectedEvent={selectedMemoryEvent}
              onSelectEvent={setSelectedMemoryEvent}
            />
          ) : (
            <LatentSpace3D
              memoryEvents={memoryEvents}
              selectedEvent={selectedMemoryEvent}
              onSelectEvent={setSelectedMemoryEvent}
            />
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <WaypointComparison />
      </div>
    </div>
  );
}

import { useAppStore } from "../stores/appStore";
import LatentSpaceView from "../components/LatentSpaceView";
import WaypointComparison from "../components/WaypointComparison";

export default function LatentSpacePage() {
  const memoryEvents = useAppStore((state) => state.memoryEvents);
  const selectedMemoryEvent = useAppStore((state) => state.selectedMemoryEvent);
  const setSelectedMemoryEvent = useAppStore(
    (state) => state.setSelectedMemoryEvent
  );

  return (
    <div className="h-full flex flex-col xl:flex-row gap-4 p-4 overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <LatentSpaceView
          memoryEvents={memoryEvents}
          selectedEvent={selectedMemoryEvent}
          onSelectEvent={setSelectedMemoryEvent}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <WaypointComparison />
      </div>
    </div>
  );
}

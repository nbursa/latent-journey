import { useAppStore } from "../stores/appStore";
import LatentSpaceView from "../components/LatentSpaceView";

export default function LatentSpacePage() {
  const memoryEvents = useAppStore((state) => state.memoryEvents);
  const selectedMemoryEvent = useAppStore((state) => state.selectedMemoryEvent);
  const setSelectedMemoryEvent = useAppStore(
    (state) => state.setSelectedMemoryEvent
  );

  return (
    <div className="flex-1 p-4">
      <LatentSpaceView
        memoryEvents={memoryEvents}
        selectedEvent={selectedMemoryEvent}
        onSelectEvent={setSelectedMemoryEvent}
      />
    </div>
  );
}

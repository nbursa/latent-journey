import { useAppStore } from "../stores/appStore";
import MemoryAnalysisView from "../components/MemoryAnalysisView";
// import DataCleanup from "../components/DataCleanup";

export default function MemoryAnalysisPage() {
  const memoryEvents = useAppStore((state) => state.memoryEvents);
  const selectedMemoryEvent = useAppStore((state) => state.selectedMemoryEvent);
  const setSelectedMemoryEvent = useAppStore(
    (state) => state.setSelectedMemoryEvent
  );

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 min-h-0">
      {/* <div className="w-full">
        <DataCleanup />
      </div> */}
      <div className="flex-1">
        <MemoryAnalysisView
          memoryEvents={memoryEvents}
          selectedEvent={selectedMemoryEvent}
          onSelectEvent={setSelectedMemoryEvent}
        />
      </div>
    </div>
  );
}

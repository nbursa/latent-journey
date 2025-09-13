import { MemoryEvent } from "../types";

interface MemoryAnalysisViewProps {
  memoryEvents: MemoryEvent[];
  selectedEvent: MemoryEvent | null;
  onSelectEvent: (event: MemoryEvent) => void;
}

export default function MemoryAnalysisView({
  memoryEvents: _memoryEvents,
  selectedEvent: _selectedEvent,
  onSelectEvent: _onSelectEvent,
}: MemoryAnalysisViewProps) {
  return (
    <div className="h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-4">Memory & Analysis</h2>
      <div className="flex-1 glass flat p-4">
        <div className="h-full bg-gray-800/50 rounded">
          <div className="text-center text-gray-400 mt-8">
            <div className="text-lg mb-2">Advanced Memory Analysis</div>
          </div>
        </div>
      </div>
    </div>
  );
}

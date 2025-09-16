import { Event, MemoryEvent } from "../types";
import FacetDisplay from "./FacetDisplay";
import { Brain } from "lucide-react";

interface LatentInsightProps {
  selectedMemoryEvent: MemoryEvent | null;
  lastSentienceToken: Event | null;
}

export default function LatentInsight({
  selectedMemoryEvent,
  lastSentienceToken,
}: LatentInsightProps) {
  return (
    <div className="flex flex-col min-h-0 max-h-full">
      <div className="glass flat p-2 flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        {selectedMemoryEvent ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-purple-300 mb-2">
              Last Memory Event
            </div>
            <div className="text-xs text-gray-400 mb-3">
              Embedding: {selectedMemoryEvent.embedding_id}
            </div>
            <div className="text-xs text-gray-500 mb-3">
              Timestamp:{" "}
              {new Date(selectedMemoryEvent.ts * 1000).toLocaleTimeString()}
            </div>
            <div className="text-xs text-gray-500 mb-3">
              Source: {selectedMemoryEvent.source}
            </div>
            {selectedMemoryEvent.facets && (
              <FacetDisplay facets={selectedMemoryEvent.facets} />
            )}
          </div>
        ) : lastSentienceToken ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-purple-300 mb-2">
              {lastSentienceToken.type}
            </div>
            <div className="text-xs text-gray-400 mb-3">
              Embedding: {lastSentienceToken.embedding_id}
            </div>
            {lastSentienceToken.ts && (
              <div className="text-xs text-gray-500 mb-3">
                Timestamp:{" "}
                {new Date(lastSentienceToken.ts * 1000).toLocaleTimeString()}
              </div>
            )}
            {lastSentienceToken.facets && (
              <FacetDisplay facets={lastSentienceToken.facets} />
            )}
          </div>
        ) : (
          <div className="text-gray-400 text-sm flex items-center gap-2">
            <Brain className="w-4 h-4" />
            No sentience tokens yet...
          </div>
        )}
      </div>
    </div>
  );
}

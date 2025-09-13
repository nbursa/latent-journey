import { Event, MemoryEvent } from "../types";
import FacetDisplay from "./FacetDisplay";
import { Lightbulb, Brain } from "lucide-react";

interface LatentInsightProps {
  selectedMemoryEvent: MemoryEvent | null;
  lastSentienceToken: Event | null;
}

export default function LatentInsight({
  selectedMemoryEvent,
  lastSentienceToken,
}: LatentInsightProps) {
  return (
    <div className="flex flex-col">
      <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <Lightbulb className="w-5 h-5" />
        Latent Insight
      </h2>
      <div className="glass flat p-3">
        {selectedMemoryEvent ? (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-purple-300 mb-2">
              Memory Event
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
          <div className="space-y-3">
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

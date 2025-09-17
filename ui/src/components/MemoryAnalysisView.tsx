import { MemoryEvent } from "../types";
import { Clock, Eye, Mic, Brain, Hash } from "lucide-react";

interface MemoryAnalysisViewProps {
  memoryEvents: MemoryEvent[];
  selectedEvent: MemoryEvent | null;
  onSelectEvent: (event: MemoryEvent) => void;
}

export default function MemoryAnalysisView({
  memoryEvents,
  selectedEvent,
  onSelectEvent,
}: MemoryAnalysisViewProps) {
  const getSourceIcon = (source: string) => {
    switch (source) {
      case "vision":
        return <Eye className="w-4 h-4 text-blue-400" />;
      case "speech":
        return <Mic className="w-4 h-4 text-green-400" />;
      case "stm":
        return <Brain className="w-4 h-4 text-yellow-400" />;
      case "ltm":
        return <Hash className="w-4 h-4 text-purple-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "vision":
        return "border-blue-400/50 bg-blue-400/10";
      case "speech":
        return "border-green-400/50 bg-green-400/10";
      case "stm":
        return "border-yellow-400/50 bg-yellow-400/10";
      case "ltm":
        return "border-purple-400/50 bg-purple-400/10";
      default:
        return "border-gray-400/50 bg-gray-400/10";
    }
  };

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-4">Memory Timeline</h2>
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="space-y-2 py-2">
          {memoryEvents.map((event, index) => {
            const arousal = Number(event.facets?.["affect.arousal"]) || 0;
            const valence = Number(event.facets?.["affect.valence"]) || 0;
            const isSelected = selectedEvent === event;

            return (
              <div
                key={`${event.embedding_id}_${index}`}
                onClick={() => onSelectEvent(event)}
                className={`p-3 rounded border cursor-pointer transition-all hover:scale-y-[1.08] ${
                  isSelected
                    ? "border-ui-accent bg-ui-accent/20"
                    : getSourceColor(event.source)
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getSourceIcon(event.source)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium capitalize">
                        {event.source}
                      </span>
                      <span className="text-xs text-ui-dim">#{index + 1}</span>
                      <div className="flex gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor:
                              valence > 0
                                ? "#10b981"
                                : valence < 0
                                ? "#ef4444"
                                : "#6b7280",
                          }}
                        />
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor:
                              arousal > 0.5 ? "#f59e0b" : "#6b7280",
                          }}
                        />
                      </div>
                    </div>

                    <div className="text-sm text-ui-text mb-2">
                      {event.content ? (
                        <div className="line-clamp-2">{event.content}</div>
                      ) : event.title ? (
                        <div className="font-medium">{event.title}</div>
                      ) : (
                        <div className="text-ui-dim italic">
                          {event.source} event
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-ui-dim">
                      <span>{new Date(event.ts * 1000).toLocaleString()}</span>
                      {event.facets?.["vision.object"] && (
                        <span>Object: {event.facets["vision.object"]}</span>
                      )}
                      {event.facets?.["speech.transcript"] && (
                        <span>"{event.facets["speech.transcript"]}"</span>
                      )}
                      {event.tags && event.tags.length > 0 && (
                        <span>Tags: {event.tags.join(", ")}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

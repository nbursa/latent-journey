import { Event } from "../types";
import { Activity, Clock, Sparkles } from "lucide-react";

interface EventsListProps {
  events: Event[];
  isProcessing: boolean;
}

export default function EventsList({ events, isProcessing }: EventsListProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 max-h-full">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Events
        </h2>
        {isProcessing && (
          <div className="flex items-center gap-2 text-green-400">
            <div className="status-dot online" />
            <span className="text-xs">Processing...</span>
          </div>
        )}
      </div>
      <div className="glass flat p-3 flex-1 overflow-y-auto min-h-0 max-h-full">
        {events.length === 0 ? (
          <div className="text-gray-400 text-sm">No events yet...</div>
        ) : (
          <div className="space-y-3">
            {events.map((event, index) => (
              <div
                key={index}
                className="border-b border-white/10 pb-3 last:border-b-0"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-blue-300">
                      {event.type}
                    </div>
                    {index < 2 && (
                      <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        NEW
                      </span>
                    )}
                  </div>
                  {event.ts && (
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(event.ts * 1000).toLocaleTimeString()}
                    </div>
                  )}
                </div>
                {event.clip_topk && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-300 mb-2">
                      CLIP Results:
                    </div>
                    {event.clip_topk.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-white min-w-0 flex-1 truncate">
                          {item.label}
                        </span>
                        <div className="flex-1 progress-bar">
                          <div
                            className={`progress-fill ${
                              isProcessing ? "animating" : ""
                            }`}
                            style={{ width: `${item.score * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 min-w-0">
                          {(item.score * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {event.transcript && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-300 mb-2">
                      Speech Transcript:
                    </div>
                    <div className="text-xs text-white bg-gray-800/50 p-2">
                      "{event.transcript}"
                    </div>
                    {event.confidence && (
                      <div className="text-xs text-gray-400">
                        Confidence: {(event.confidence * 100).toFixed(1)}%
                      </div>
                    )}
                    {event.language && (
                      <div className="text-xs text-gray-400">
                        Language: {event.language}
                      </div>
                    )}
                  </div>
                )}
                {event.message && (
                  <div className="text-xs text-gray-300 mt-2">
                    {event.message}
                  </div>
                )}
                {event.embedding_id && (
                  <div className="text-xs text-gray-400 mt-1">
                    Embedding: {event.embedding_id}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

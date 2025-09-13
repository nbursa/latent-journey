import { Event, MemoryEvent, MemoryFilter, MediaRefs } from "../types";

interface ExplorationViewProps {
  events: Event[];
  isProcessing: boolean;
  isRecording: boolean;
  lastSentienceToken: Event | null;
  memoryEvents: MemoryEvent[];
  memoryFilter: MemoryFilter;
  selectedMemoryEvent: MemoryEvent | null;
  audioLevels: number[];
  mediaRefs: MediaRefs;
  onSnapAndSend: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSetMemoryFilter: (filter: MemoryFilter) => void;
  onSelectMemoryEvent: (event: MemoryEvent | null) => void;
}

export default function ExplorationView({
  events,
  isProcessing,
  isRecording,
  lastSentienceToken,
  memoryEvents,
  memoryFilter,
  selectedMemoryEvent,
  audioLevels,
  mediaRefs,
  onSnapAndSend,
  onStartRecording,
  onStopRecording,
  onSetMemoryFilter,
  onSelectMemoryEvent,
}: ExplorationViewProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Postojeći sadržaj iz App.tsx */}
      <div className="flex-1 flex flex-col xl:flex-row gap-4 p-4 min-h-0">
        {/* Camera Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <h2 className="text-lg font-semibold mb-2">Live Camera</h2>
          <div className="flex-1 flex flex-col min-h-0">
            <div className="relative w-full flat glass-border flex-shrink-0 min-h-0">
              <video
                ref={mediaRefs.videoRef}
                autoPlay
                playsInline
                className="w-full h-auto object-cover"
              />
              <div className="absolute inset-0 p-2 flex items-end justify-start bg-gray-900/50">
                <div className="text-left">
                  <div className="text-sm text-gray-300 mb-2">Camera Ready</div>
                  <div className="text-xs text-gray-400">
                    Click "Capture & Analyze" to take photos
                  </div>
                </div>
              </div>
            </div>

            {/* Audio Visualizer - Between Camera and Buttons */}
            <div className="glass flat p-3 mt-2">
              <div className="text-xs text-gray-300 mb-2">
                Audio Level {isRecording ? "(Recording)" : "(Idle)"}
              </div>
              <div className="flex items-end gap-1 h-12">
                {audioLevels.slice(0, 32).map((level, index) => (
                  <div
                    key={index}
                    className={`flex-1 transition-all duration-75 ${
                      isRecording
                        ? "bg-gradient-to-t from-blue-500 to-purple-500"
                        : "bg-gradient-to-t from-gray-600 to-gray-500"
                    }`}
                    style={{
                      height: `${Math.max(level * 100, 2)}%`,
                      opacity: level > 0.1 ? 1 : 0.3,
                    }}
                  />
                ))}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {isRecording
                  ? `Peak: ${(Math.max(...audioLevels) * 100).toFixed(1)}%`
                  : "Click 'Start Recording' to see audio levels"}
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={onSnapAndSend}
                disabled={isProcessing}
                className={`btn btn-primary flex-1 text-sm flat hover-glow hover-scale ${
                  isProcessing ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isProcessing ? "Processing..." : "Capture & Analyze"}
              </button>
              <button
                onClick={isRecording ? onStopRecording : onStartRecording}
                disabled={isProcessing}
                className={`btn ${
                  isRecording ? "btn-danger" : "btn-secondary"
                } flex-1 text-sm flat hover-glow hover-scale ${
                  isProcessing ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isRecording ? "Stop Recording" : "Start Recording"}
              </button>
            </div>

            <canvas ref={mediaRefs.canvasRef} className="hidden" />
          </div>
        </div>

        {/* Events Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Events</h2>
            {isProcessing && (
              <div className="flex items-center gap-2 text-green-400">
                <div className="status-dot online" />
                <span className="text-xs">Processing...</span>
              </div>
            )}
          </div>
          <div className="glass flat p-3 flex-1 overflow-auto min-h-0">
            {events.length === 0 ? (
              <div className="text-gray-400 text-sm">No events yet...</div>
            ) : (
              <div className="space-y-3">
                {events.map((event, index) => (
                  <div
                    key={index}
                    className="border-b border-white/10 pb-3 last:border-b-0"
                  >
                    <div className="text-sm font-semibold text-blue-300 mb-2">
                      {event.type}
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

        {/* Panel B: Latent Insight */}
        <div className="flex-1 flex flex-col min-h-0">
          <h2 className="text-lg font-semibold mb-2">Latent Insight</h2>
          <div className="glass flat p-3 flex-shrink-0 overflow-auto min-h-0">
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
                  <div className="space-y-2">
                    <div className="text-xs text-gray-300 mb-2">Facets:</div>
                    {(() => {
                      // Label mapping for better display names
                      const labelMap: Record<string, string> = {
                        "speech.transcript": "Speech Transcript",
                        "speech.intent": "Speech Intent",
                        "speech.sentiment": "Speech Sentiment",
                        "vision.object": "Vision Object",
                        "color.dominant": "Dominant Color",
                        "affect.valence": "Affect Valence",
                        "affect.arousal": "Affect Arousal",
                      };

                      // Sort facets by category: speech.*, vision.*, color.*, affect.*
                      const sortedEntries = Object.entries(
                        selectedMemoryEvent.facets
                      ).sort(([a], [b]) => {
                        const getCategory = (key: string) => {
                          if (key.startsWith("speech.")) return 0;
                          if (key.startsWith("vision.")) return 1;
                          if (key.startsWith("color.")) return 2;
                          if (key.startsWith("affect.")) return 3;
                          return 4;
                        };
                        return getCategory(a) - getCategory(b);
                      });

                      return sortedEntries.map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span
                            className="text-xs text-white min-w-0 flex-1 truncate"
                            title={
                              key === "affect.valence"
                                ? "Valence: Emotional positivity/negativity (-1 to +1, where +1 is most positive)"
                                : key === "affect.arousal"
                                ? "Arousal: Emotional intensity/energy (0 to 1, where 1 is most intense)"
                                : undefined
                            }
                          >
                            {labelMap[key] || key}:
                          </span>
                          {(key === "affect.valence" ||
                            key === "affect.arousal") &&
                          typeof value === "number" ? (
                            <div className="flex-1 flex items-center gap-2">
                              <div className="flex-1 progress-bar">
                                <div
                                  className="progress-fill"
                                  style={{
                                    width:
                                      key === "affect.valence"
                                        ? `${((value + 1) / 2) * 100}%`
                                        : `${value * 100}%`,
                                    background:
                                      key === "affect.valence"
                                        ? value >= 0
                                          ? "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))"
                                          : "linear-gradient(90deg, var(--accent-secondary), var(--accent-primary))"
                                        : "linear-gradient(90deg, var(--accent-tertiary), var(--accent-quaternary))",
                                  }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 min-w-0">
                                {value.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300 min-w-0">
                              {String(value)}
                            </span>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
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
                    {new Date(
                      lastSentienceToken.ts * 1000
                    ).toLocaleTimeString()}
                  </div>
                )}
                {lastSentienceToken.facets && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-300 mb-2">Facets:</div>
                    {(() => {
                      // Label mapping for better display names
                      const labelMap: Record<string, string> = {
                        "speech.transcript": "Speech Transcript",
                        "speech.intent": "Speech Intent",
                        "speech.sentiment": "Speech Sentiment",
                        "vision.object": "Vision Object",
                        "color.dominant": "Dominant Color",
                        "affect.valence": "Affect Valence",
                        "affect.arousal": "Affect Arousal",
                      };

                      // Sort facets by category: speech.*, vision.*, color.*, affect.*
                      const sortedEntries = Object.entries(
                        lastSentienceToken.facets
                      ).sort(([a], [b]) => {
                        const getCategory = (key: string) => {
                          if (key.startsWith("speech.")) return 0;
                          if (key.startsWith("vision.")) return 1;
                          if (key.startsWith("color.")) return 2;
                          if (key.startsWith("affect.")) return 3;
                          return 4;
                        };
                        return getCategory(a) - getCategory(b);
                      });

                      return sortedEntries.map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span
                            className="text-xs text-white min-w-0 flex-1 truncate"
                            title={
                              key === "affect.valence"
                                ? "Valence: Emotional positivity/negativity (-1 to +1, where +1 is most positive)"
                                : key === "affect.arousal"
                                ? "Arousal: Emotional intensity/energy (0 to 1, where 1 is most intense)"
                                : undefined
                            }
                          >
                            {labelMap[key] || key}:
                          </span>
                          {(key === "affect.valence" ||
                            key === "affect.arousal") &&
                          typeof value === "number" ? (
                            <div className="flex-1 flex items-center gap-2">
                              <div className="flex-1 progress-bar">
                                <div
                                  className="progress-fill"
                                  style={{
                                    width:
                                      key === "affect.valence"
                                        ? `${((value + 1) / 2) * 100}%`
                                        : `${value * 100}%`,
                                    background:
                                      key === "affect.valence"
                                        ? value >= 0
                                          ? "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))"
                                          : "linear-gradient(90deg, var(--accent-secondary), var(--accent-primary))"
                                        : "linear-gradient(90deg, var(--accent-tertiary), var(--accent-quaternary))",
                                  }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 min-w-0">
                                {value.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300 min-w-0">
                              {String(value)}
                            </span>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-400 text-sm">
                No sentience tokens yet...
              </div>
            )}
          </div>
        </div>

        {/* Panel C: Memory Timeline */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Memory Timeline</h2>
            <div className="flex gap-1">
              <button
                onClick={() => onSetMemoryFilter("all")}
                className={`px-2 py-1 text-xs flat ${
                  memoryFilter === "all" ? "btn-primary" : "btn-secondary"
                }`}
              >
                All
              </button>
              <button
                onClick={() => onSetMemoryFilter("speech")}
                className={`px-2 py-1 text-xs flat ${
                  memoryFilter === "speech" ? "btn-primary" : "btn-secondary"
                }`}
              >
                Speech
              </button>
              <button
                onClick={() => onSetMemoryFilter("vision")}
                className={`px-2 py-1 text-xs flat ${
                  memoryFilter === "vision" ? "btn-primary" : "btn-secondary"
                }`}
              >
                Vision
              </button>
            </div>
          </div>
          <div className="glass flat p-3 flex-1 overflow-auto min-h-0">
            {memoryEvents.length === 0 ? (
              <div className="text-gray-400 text-sm">
                No memory events yet...
              </div>
            ) : (
              <div className="space-y-2">
                {memoryEvents
                  .filter(
                    (event) =>
                      memoryFilter === "all" || event.source === memoryFilter
                  )
                  .map((event, index) => (
                    <div
                      key={index}
                      onClick={() => onSelectMemoryEvent(event)}
                      className={`p-2 border border-white/10 cursor-pointer hover:bg-white/5 transition-colors ${
                        selectedMemoryEvent?.ts === event.ts
                          ? "bg-blue-500/20 border-blue-400"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-300">
                          {new Date(event.ts * 1000).toLocaleTimeString()}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 ${
                            event.source === "speech"
                              ? "bg-green-500/20 text-green-300"
                              : "bg-blue-500/20 text-blue-300"
                          }`}
                        >
                          {event.source}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mb-1">
                        {event.embedding_id}
                      </div>
                      <div className="text-xs text-gray-500">
                        {Object.keys(event.facets).length} facets
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

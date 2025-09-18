import { useState, useEffect, useMemo } from "react";
import { Brain } from "lucide-react";

export default function MemorySummary() {
  const [stmData, setStmData] = useState<any[]>([]);
  const [ltmData, setLtmData] = useState<any[]>([]);
  const [eventsData, setEventsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Combine all memory data into a unified timeline
  const allMemoryEvents = useMemo(() => {
    const events = [
      // STM data - these are text-based thoughts with facets
      ...stmData.map((item) => ({
        ...item,
        source: "stm",
        type: "short_term",
        ts: new Date(item.timestamp).getTime() / 1000,
        content: item.content,
        facets: item.facets || {},
        tags: item.tags || [],
        embedding_id: item.id,
      })),
      // LTM data - these are consolidated experiences
      ...ltmData.map((item) => ({
        ...item,
        source: "ltm",
        type: "long_term",
        ts: new Date(item.created_at).getTime() / 1000,
        content: item.summary,
        facets: {
          "affect.valence": item.emotional_tone || 0,
          "affect.arousal": item.importance || 0,
          "consolidation.themes": item.themes || [],
          "consolidation.consolidated_from": item.consolidated_from || [],
        },
        tags: item.tags || [],
        title: item.title,
        summary: item.summary,
      })),
      // Events data - these are perception events (vision, speech)
      ...eventsData.map((item) => ({
        ...item,
        source: item.source || "event",
        type: "perception",
        ts: item.ts || Date.now() / 1000,
        facets: item.facets || {},
        embedding_id: item.embedding_id,
      })),
    ];

    const sortedEvents = events.sort((a, b) => a.ts - b.ts);
    return sortedEvents;
  }, [stmData, ltmData, eventsData]);

  // Load data from actual sources
  useEffect(() => {
    const loadMemoryData = async () => {
      setIsLoading(true);
      try {
        // Load STM data from API
        const stmResponse = await fetch("/api/ego/memories");
        if (stmResponse.ok) {
          const stmResult = await stmResponse.json();
          const stmData = stmResult.data || [];
          setStmData(stmData);
        }

        // Load LTM data from API
        const ltmResponse = await fetch("/api/ego/experiences");
        if (ltmResponse.ok) {
          const ltmResult = await ltmResponse.json();
          const ltmData = ltmResult.data || [];
          setLtmData(ltmData);
        }

        // Load events data from API
        const eventsResponse = await fetch("/api/memory");
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          setEventsData(eventsData);
        }
      } catch (error) {
        console.error("Error loading memory data:", error);
        // Fallback to empty arrays if API calls fail
        setStmData([]);
        setLtmData([]);
        setEventsData([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMemoryData();
  }, []);

  if (isLoading) {
    return (
      <div className="glass p-3 rounded">
        <div className="flex items-center gap-2 text-sm text-ui-dim">
          <Brain className="w-4 h-4 animate-pulse" />
          <span>Loading Memory Data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass p-3 rounded">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-medium">Memory Summary</h3>
      </div>
      <div className="text-xs space-y-4">
        <div>Total Events: {allMemoryEvents.length}</div>
        <div className="flex gap-4">
          <span>
            STM: {allMemoryEvents.filter((e) => e.source === "stm").length}
          </span>
          <span>
            LTM: {allMemoryEvents.filter((e) => e.source === "ltm").length}
          </span>
          <span>
            Vision:{" "}
            {allMemoryEvents.filter((e) => e.source === "vision").length}
          </span>
          <span>
            Speech:{" "}
            {allMemoryEvents.filter((e) => e.source === "speech").length}
          </span>
        </div>
      </div>
    </div>
  );
}

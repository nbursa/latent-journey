import { useState, useEffect } from "react";

interface STMThought {
  content: string;
  embedding: number[];
  embedding_id: string;
  facets: {
    context_hash: string;
    creative_insight: number;
    emotional_stability: number;
    memory_consolidation_need: number;
    self_awareness: number;
  };
  source: string;
  tags: string[];
  ts: number;
}

interface STMData {
  thoughts: STMThought[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSTMData(): STMData {
  const [thoughts, setThoughts] = useState<STMThought[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSTMData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching STM data from /api/ego/memories");
      const response = await fetch("/api/ego/memories");
      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("HTTP error response:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const data = await response.json();
      console.log("STM data response:", data);

      if (data.success) {
        setThoughts(data.data);
        console.log(
          "STM data loaded successfully:",
          data.data.length,
          "thoughts"
        );
      } else {
        throw new Error(data.error || "Failed to load STM data");
      }
    } catch (err) {
      console.error("Failed to load STM data:", err);
      setError(err instanceof Error ? err.message : "Failed to load STM data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSTMData();
  }, []);

  // Listen for new thought events and refetch data
  useEffect(() => {
    const handleSSEMessage = (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data);
        // Refetch when a new thought is generated
        if (event.type === "thought.generated") {
          console.log("New thought generated, refetching STM data...");
          fetchSTMData();
        }
      } catch (error) {
        // Ignore parsing errors for non-JSON events
      }
    };

    // Listen for custom events from the SSE connection
    const handleCustomEvent = (e: CustomEvent) => {
      if (e.detail && e.detail.type === "thought.generated") {
        console.log(
          "New thought generated via custom event, refetching STM data..."
        );
        fetchSTMData();
      }
    };

    // Add event listeners
    window.addEventListener("message", handleSSEMessage);
    window.addEventListener("sse-message", handleCustomEvent as EventListener);

    return () => {
      window.removeEventListener("message", handleSSEMessage);
      window.removeEventListener(
        "sse-message",
        handleCustomEvent as EventListener
      );
    };
  }, []);

  return {
    thoughts,
    loading,
    error,
    refetch: fetchSTMData,
  };
}

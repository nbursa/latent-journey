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
      const response = await fetch("/api/ego/memories");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setThoughts(data.data);
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

  return {
    thoughts,
    loading,
    error,
    refetch: fetchSTMData,
  };
}

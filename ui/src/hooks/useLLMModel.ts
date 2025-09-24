import { useState, useEffect } from "react";

interface LLMModelInfo {
  model: string;
  provider: string;
  status: string;
  available: boolean;
  statusColor: "green" | "yellow" | "red";
  statusText: string;
}

// Helper function to determine status color and text
const getStatusInfo = (status: string) => {
  switch (status) {
    case "healthy":
      return { color: "green" as const, text: "Healthy" };
    case "degraded":
      return { color: "yellow" as const, text: "Degraded" };
    case "unhealthy":
      return { color: "red" as const, text: "Unhealthy" };
    default:
      return { color: "red" as const, text: "Unknown" };
  }
};

export function useLLMModel() {
  const [modelInfo, setModelInfo] = useState<LLMModelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModelInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get model info from LLM service health endpoint via gateway
      const response = await fetch("/llm/health");

      if (response.ok) {
        const data = await response.json();
        const statusInfo = getStatusInfo(data.status || "unknown");
        setModelInfo({
          model: data.model || "unknown",
          provider: data.provider || "unknown",
          status: data.status || "unknown",
          available: data.status === "healthy" || data.status === "degraded",
          statusColor: statusInfo.color,
          statusText: statusInfo.text,
        });
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      console.error("Failed to fetch LLM model info:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch model info"
      );
      setModelInfo({
        model: "unknown",
        provider: "unknown",
        status: "offline",
        available: false,
        statusColor: "red",
        statusText: "Offline",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModelInfo();

    // Refresh every 30 seconds
    const interval = setInterval(fetchModelInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    modelInfo,
    loading,
    error,
    refetch: fetchModelInfo,
  };
}

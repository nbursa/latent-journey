import { useState, useEffect, useCallback } from "react";
import { Memory } from "../types/memory";
import { egoService, EgoThought } from "../services/egoService";

interface UseEgoOptions {
  memories: Memory[];
  autoGenerate?: boolean;
  intervalMs?: number;
}

interface UseEgoReturn {
  // State
  currentThought: EgoThought | null;
  thoughtHistory: EgoThought[];
  isGenerating: boolean;
  isEgoAvailable: boolean;
  ollamaAvailable: boolean;
  ollamaStatus: any;
  error: string | null;

  // Actions
  generateThought: (userQuery?: string) => Promise<void>;
  consolidateMemories: (memoryIds: string[]) => Promise<void>;
  clearHistory: () => void;

  // Stats
  totalMemories: number;
}

export function useEgo({
  memories,
  autoGenerate = false,
  intervalMs = 60000, // 1 minute
}: UseEgoOptions): UseEgoReturn {
  const [currentThought, setCurrentThought] = useState<EgoThought | null>(null);
  const [thoughtHistory, setThoughtHistory] = useState<EgoThought[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEgoAvailable, setIsEgoAvailable] = useState(false);
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Check ego service availability
  const checkEgoHealth = useCallback(async () => {
    try {
      const available = await egoService.checkHealth();
      setIsEgoAvailable(available);
      if (!available) {
        setError("Ego service is not available");
      } else {
        setError(null);
      }
    } catch (err) {
      setIsEgoAvailable(false);
      setError("Failed to check ego service status");
    }
  }, []);

  // Check Ollama status
  const checkOllamaStatus = useCallback(async () => {
    try {
      const status = await egoService.getStatus();
      setOllamaStatus(status);
      setOllamaAvailable(status.ollama?.available || false);
    } catch (err) {
      setOllamaAvailable(false);
      setOllamaStatus(null);
    }
  }, []);

  // Generate a new thought
  const generateThought = useCallback(
    async (userQuery?: string) => {
      if (!isEgoAvailable) {
        setError("Ego service is not available");
        return;
      }

      setIsGenerating(true);
      setError(null);

      try {
        // Signal gateway to pause status checks
        await egoService.startGeneration();

        const thought = await egoService.reflect(memories, userQuery);

        if (thought) {
          setCurrentThought(thought);
          setThoughtHistory((prev) => [thought, ...prev.slice(0, 49)]); // Keep last 50 thoughts
        } else {
          setError("No relevant memories found for reflection");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(`Reflection generation failed: ${errorMessage}`);
        console.error("Reflection generation error:", err);
      } finally {
        // Signal gateway to resume status checks
        await egoService.stopGeneration();
        setIsGenerating(false);
      }
    },
    [memories, isEgoAvailable]
  );

  // Consolidate memories
  const consolidateMemories = useCallback(async (memoryIds: string[]) => {
    try {
      const result = await egoService.consolidate(memoryIds);
      if (result) {
        console.log("Consolidated memories into concept:", result.title);
      }
    } catch (err) {
      console.error("Memory consolidation failed:", err);
      setError(
        `Consolidation failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  }, []);

  // Clear thought history
  const clearHistory = useCallback(() => {
    setThoughtHistory([]);
    setCurrentThought(null);
  }, []);

  // Auto-generate thoughts
  useEffect(() => {
    if (!autoGenerate || !isEgoAvailable) return;

    const interval = setInterval(() => {
      generateThought();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [autoGenerate, isEgoAvailable, generateThought, intervalMs]);

  // Check services on mount
  useEffect(() => {
    checkEgoHealth();
    checkOllamaStatus();
  }, [checkEgoHealth, checkOllamaStatus]);

  return {
    // State
    currentThought,
    thoughtHistory,
    isGenerating,
    isEgoAvailable,
    ollamaAvailable,
    ollamaStatus,
    error,

    // Actions
    generateThought,
    consolidateMemories,
    clearHistory,

    // Stats
    totalMemories: memories.length,
  };
}

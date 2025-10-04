import { useEffect, useRef, useState } from "react";
import { useSTMData } from "./useSTMData";

interface UseAutoGenerationOptions {
  /** Number of events needed to trigger automatic thought generation */
  eventThreshold?: number;
  /** Number of thoughts needed to trigger automatic experience consolidation */
  thoughtThreshold?: number;
  /** Check interval in milliseconds */
  checkIntervalMs?: number;
  /** Whether automatic generation is enabled */
  enabled?: boolean;
}

interface UseAutoGenerationReturn {
  /** Number of events currently loaded */
  eventCount: number;
  /** Number of thoughts currently in STM */
  thoughtCount: number;
  /** Events remaining until next automatic thought generation */
  eventsUntilThought: number;
  /** Thoughts remaining until next automatic experience consolidation */
  thoughtsUntilExperience: number;
  /** Whether we're waiting for automatic thought generation */
  awaitingThought: boolean;
  /** Whether we're waiting for automatic experience consolidation */
  awaitingExperience: boolean;
  /** Whether manual thought generation is in progress */
  isGeneratingThought: boolean;
  /** Whether manual experience consolidation is in progress */
  isConsolidatingExperience: boolean;
  /** Force trigger thought generation for current events */
  triggerThoughtGeneration: () => Promise<void>;
  /** Force trigger experience consolidation for current thoughts */
  triggerExperienceConsolidation: () => Promise<void>;
}

export function useAutoGeneration({
  eventThreshold = 10,
  thoughtThreshold = 10,
  checkIntervalMs = 5000,
  enabled = false,
}: UseAutoGenerationOptions = {}): UseAutoGenerationReturn {
  const [eventCount] = useState(0); // TODO: Implement event counting from app store
  const [thoughtCount, setThoughtCount] = useState(0);
  const [lastProcessedThoughts, setLastProcessedThoughts] = useState(0);
  const [lastProcessedEvents, setLastProcessedEvents] = useState(0);
  const [isGeneratingThought, setIsGeneratingThought] = useState(false);
  const [isConsolidatingExperience, setIsConsolidatingExperience] =
    useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { thoughts: stmThoughts, refetch: refetchSTMData } = useSTMData();

  // Update thought count when STM changes
  useEffect(() => {
    setThoughtCount(stmThoughts.length);
  }, [stmThoughts]);

  // Calculate thresholds
  const eventsUntilThought =
    eventThreshold - (eventCount - lastProcessedEvents);
  const thoughtsUntilExperience =
    thoughtThreshold - (thoughtCount - lastProcessedThoughts);
  const awaitingThought =
    eventCount >= eventThreshold && lastProcessedEvents < eventCount;
  const awaitingExperience =
    thoughtCount >= thoughtThreshold && lastProcessedThoughts < thoughtCount;

  // Force thought generation
  const triggerThoughtGeneration = async () => {
    if (isGeneratingThought) {
      console.log("⏳ Thought generation already in progress, skipping...");
      return;
    }

    setIsGeneratingThought(true);
    try {
      console.log("🔄 Triggering thought generation...");

      // Create diverse context for thought generation
      const diverseMemories = [
        {
          id: `memory-${Date.now()}-1`,
          content: "I'm processing sensor input from my environment",
          timestamp: new Date().toISOString(),
          modality: "text",
          embedding: [],
          facets: {
            self_awareness: Math.random() * 0.5 + 0.3, // 0.3-0.8
            emotional_stability: Math.random() * 0.6 + 0.2, // 0.2-0.8
            creative_insight: Math.random() * 0.5 + 0.4, // 0.4-0.9
          },
          tags: ["context"],
        },
        {
          id: `memory-${Date.now()}-2`,
          content: "I observe patterns in the data stream",
          timestamp: new Date().toISOString(),
          modality: "concept",
          embedding: [],
          facets: {
            self_awareness: Math.random() * 0.4 + 0.4, // 0.4-0.8
            emotional_stability: Math.random() * 0.4 + 0.3, // 0.3-0.7
            creative_insight: Math.random() * 0.6 + 0.2, // 0.2-0.8
          },
          tags: ["analysis"],
        },
      ];

      // Call the ego service via the gateway
      const response = await fetch("/api/ego/reflect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memories: diverseMemories,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Thought generation completed:", result);
        setLastProcessedEvents(eventCount); // Update processed count

        // Refresh STM data to show the new thought in the UI
        console.log("🔄 Refreshing STM data to show new thought...");
        await refetchSTMData();
      } else {
        const errorText = await response.text();
        console.error(
          "❌ Thought generation failed:",
          response.status,
          errorText
        );
        throw new Error(
          `Thought generation failed: ${response.status} - ${errorText}`
        );
      }
    } catch (error) {
      console.error("❌ Error triggering thought generation:", error);
      // You might want to show an error state here
    } finally {
      setIsGeneratingThought(false);
    }
  };

  // Force experience consolidation
  const triggerExperienceConsolidation = async () => {
    if (isConsolidatingExperience) {
      console.log(
        "⏳ Experience consolidation already in progress, skipping..."
      );
      return;
    }

    setIsConsolidatingExperience(true);
    try {
      console.log("🔄 Triggering experience consolidation...");

      // Call the consolidation API via the gateway
      const response = await fetch("/api/ego/consolidate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          force: true,
          max_experiences: 5,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("✅ Experience consolidation completed:", result);
        setLastProcessedThoughts(thoughtCount); // Update processed count
      } else {
        const errorText = await response.text();
        console.error(
          "❌ Experience consolidation failed:",
          response.status,
          errorText
        );
        throw new Error(
          `Consolidation failed: ${response.status} - ${errorText}`
        );
      }
    } catch (error) {
      console.error("❌ Error triggering experience consolidation:", error);
      // You might want to show an error state here
    } finally {
      setIsConsolidatingExperience(false);
    }
  };

  // Monitor and trigger automatic generation
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    console.log("🚀 Starting automatic generation monitoring");
    console.log(
      `📊 Event threshold: ${eventThreshold}, Thought threshold: ${thoughtThreshold}`
    );

    const checkAndTrigger = () => {
      // Check if we need to generate thoughts
      if (eventCount >= eventThreshold && lastProcessedEvents < eventCount) {
        console.log(`🎯 Reached event threshold: ${eventCount} events`);
        triggerThoughtGeneration();
      }

      // Check if we need to consolidate experiences
      if (
        thoughtCount >= thoughtThreshold &&
        lastProcessedThoughts < thoughtCount
      ) {
        console.log(`🎯 Reached thought threshold: ${thoughtCount} thoughts`);
        triggerExperienceConsolidation();
      }
    };

    // Initial check
    checkAndTrigger();

    // Set up interval for regular checks
    intervalRef.current = setInterval(checkAndTrigger, checkIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      console.log("🛑 Stopped automatic generation monitoring");
    };
  }, [
    enabled,
    eventCount,
    thoughtCount,
    eventThreshold,
    thoughtThreshold,
    lastProcessedEvents,
    lastProcessedThoughts,
    checkIntervalMs,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    eventCount,
    thoughtCount,
    eventsUntilThought: Math.max(0, eventsUntilThought),
    thoughtsUntilExperience: Math.max(0, thoughtsUntilExperience),
    awaitingThought,
    awaitingExperience,
    isGeneratingThought,
    isConsolidatingExperience,
    triggerThoughtGeneration,
    triggerExperienceConsolidation,
  };
}

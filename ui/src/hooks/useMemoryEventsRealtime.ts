import { useCallback, useEffect, useRef } from "react";
import { MemoryEvent } from "../types";
import { useAppStore } from "../stores/appStore";

// Global flag to prevent multiple initializations across hook instances
let globalInitialized = false;

export const useMemoryEventsRealtime = () => {
  const addMemoryEvent = useAppStore((state) => state.addMemoryEvent);
  const lastMemoryTimestamp = useRef<number>(0);
  const initialized = useRef<boolean>(false);

  const loadMemoryEvents = useCallback(async () => {
    try {
      // Get the timestamp of the most recent memory event we have
      const sinceTimestamp = lastMemoryTimestamp.current;

      const response = await fetch(
        `/sentience/memory?limit=200&since_ts=${sinceTimestamp}`
      );
      if (response.ok) {
        const events = await response.json();

        if (events.length > 0) {
          // Update the last timestamp
          lastMemoryTimestamp.current = Math.max(
            ...events.map((event: MemoryEvent) => event.ts)
          );

          // Get current memory events from store for deduplication
          const currentMemoryEvents = useAppStore.getState().memoryEvents;
          const existingTimestamps = new Set(
            currentMemoryEvents.map((event) => event.ts)
          );

          // Add each new event to the store (they're already sorted newest first from backend)
          events.forEach((event: MemoryEvent) => {
            // Only add if we don't already have this event
            if (!existingTimestamps.has(event.ts)) {
              addMemoryEvent(event);
            } else {
              console.log("Skipping duplicate memory event:", event.ts);
            }
          });
        }
      }
    } catch (error) {
      console.error("Error loading memory events:", error);
    }
  }, [addMemoryEvent]);

  const initializeMemoryEvents = useCallback(async () => {
    // Only initialize once globally
    if (globalInitialized || initialized.current) {
      return;
    }

    globalInitialized = true;

    // Clear any existing memory events first (in case they were persisted)
    useAppStore.setState({ memoryEvents: [] });

    try {
      const response = await fetch("/sentience/memory?limit=200");
      if (response.ok) {
        const events = await response.json();

        if (events.length > 0) {
          // Set the initial timestamp
          lastMemoryTimestamp.current = Math.max(
            ...events.map((event: MemoryEvent) => event.ts)
          );

          // Add each event to the store in reverse order (newest first)
          // Store will handle deduplication
          events.reverse().forEach((event: MemoryEvent) => {
            addMemoryEvent(event);
          });
        }

        initialized.current = true;
      }
    } catch (error) {
      console.error("Error initializing memory events:", error);
      globalInitialized = false; // Reset on error
    }
  }, [addMemoryEvent]);

  // Only initialize memory events on mount, no automatic polling
  useEffect(() => {
    // Initialize with existing memory events
    initializeMemoryEvents();
  }, [initializeMemoryEvents]);

  return {
    loadMemoryEvents,
    initializeMemoryEvents,
  };
};

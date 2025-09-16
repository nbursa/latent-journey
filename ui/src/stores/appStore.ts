import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Event, MemoryEvent, ServicesStatus, MemoryFilter } from "../types";

interface AppState {
  // Events data
  events: Event[];
  lastSentienceToken: Event | null;

  // Memory data
  memoryEvents: MemoryEvent[];
  memoryFilter: MemoryFilter;
  selectedMemoryEvent: MemoryEvent | null;

  // Captures data
  captures: string[];

  // Services status
  servicesStatus: ServicesStatus;

  // UI state
  isRecording: boolean;
  isProcessing: boolean;

  // Waypoint system
  waypoints: Set<number>; // timestamps of waypoint events
  waypointA: MemoryEvent | null;
  waypointB: MemoryEvent | null;

  // Actions
  addEvent: (event: Event) => void;
  setLastSentienceToken: (token: Event | null) => void;
  addMemoryEvent: (event: MemoryEvent) => void;
  setMemoryFilter: (filter: MemoryFilter) => void;
  setSelectedMemoryEvent: (event: MemoryEvent | null) => void;
  addCapture: (capture: string) => void;
  setCaptures: (captures: string[]) => void;
  updateServicesStatus: (status: ServicesStatus) => void;
  setIsRecording: (recording: boolean) => void;
  setIsProcessing: (processing: boolean) => void;

  // Waypoint actions
  toggleWaypoint: (timestamp: number) => void;
  setWaypointA: (event: MemoryEvent | null) => void;
  setWaypointB: (event: MemoryEvent | null) => void;
  clearWaypoints: () => void;

  // Cleanup actions
  clearAllData: () => void;
  clearEvents: () => void;
  clearCaptures: () => void;
}

const initialState = {
  events: [],
  lastSentienceToken: null,
  memoryEvents: [],
  memoryFilter: "all" as MemoryFilter,
  selectedMemoryEvent: null,
  captures: [],
  servicesStatus: {
    gateway: "offline",
    ml: "offline",
    sentience: "offline",
    llm: "offline",
    ego: "offline",
    embeddings: "offline",
  },
  isRecording: false,
  isProcessing: false,
  waypoints: new Set<number>(),
  waypointA: null,
  waypointB: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      // Event actions
      addEvent: (event: Event) => {
        set((state) => ({
          events: [event, ...state.events].slice(0, 100), // Keep last 100 events
        }));
      },

      setLastSentienceToken: (token: Event | null) => {
        set({ lastSentienceToken: token });
      },

      // Memory actions
      addMemoryEvent: (event: MemoryEvent) => {
        set((state) => {
          // Check if event already exists to prevent duplicates
          const exists = state.memoryEvents.some(
            (existing) => existing.ts === event.ts
          );
          if (exists) {
            return state;
          }
          return {
            memoryEvents: [event, ...state.memoryEvents].slice(0, 500), // Keep last 500 memory events
            selectedMemoryEvent: event, // Auto-select the newest memory event
          };
        });
      },

      setMemoryFilter: (filter: MemoryFilter) => {
        set({ memoryFilter: filter });
      },

      setSelectedMemoryEvent: (event: MemoryEvent | null) => {
        set({ selectedMemoryEvent: event });
      },

      // Capture actions
      addCapture: (capture: string) => {
        set((state) => ({
          captures: [capture, ...state.captures].slice(0, 50), // Keep last 50 captures
        }));
      },

      setCaptures: (captures: string[]) => {
        set({ captures });
      },

      // Services status actions
      updateServicesStatus: (status: ServicesStatus) => {
        set({ servicesStatus: status });
      },

      // UI state actions
      setIsRecording: (recording: boolean) => {
        set({ isRecording: recording });
      },

      setIsProcessing: (processing: boolean) => {
        set({ isProcessing: processing });
      },

      // Cleanup actions - clear UI data and persistent memory data
      clearAllData: async () => {
        try {
          // Clear ID service data
          await fetch("http://localhost:8082/clear", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          // Clear Ego service data
          await fetch("http://localhost:8084/api/ego/clear", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });

          console.log("Successfully cleared all data from services");
        } catch (error) {
          console.error("Failed to clear service data:", error);
        }

        // Clear UI state
        set({
          events: [],
          lastSentienceToken: null,
          memoryEvents: [],
          captures: [],
          selectedMemoryEvent: null,
          memoryFilter: "all",
          isRecording: false,
          isProcessing: false,
          servicesStatus: {
            gateway: "unknown",
            ml: "unknown",
            sentience: "unknown",
            llm: "unknown",
            ego: "unknown",
            embeddings: "unknown",
          },
        });
      },

      clearEvents: () => {
        set({ events: [], lastSentienceToken: null });
      },

      clearCaptures: () => {
        set({ captures: [] });
      },

      // Waypoint actions
      toggleWaypoint: (timestamp: number) => {
        set((state) => {
          const newWaypoints = new Set(state.waypoints);
          if (newWaypoints.has(timestamp)) {
            newWaypoints.delete(timestamp);
          } else {
            newWaypoints.add(timestamp);
          }
          return { waypoints: newWaypoints };
        });
      },

      setWaypointA: (event: MemoryEvent | null) => {
        set({ waypointA: event });
      },

      setWaypointB: (event: MemoryEvent | null) => {
        set({ waypointB: event });
      },

      clearWaypoints: () => {
        set({
          waypoints: new Set<number>(),
          waypointA: null,
          waypointB: null,
        });
      },
    }),
    {
      name: "latent-journey-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist certain data, not UI state or persistent backend data
      partialize: (state) => ({
        events: state.events,
        lastSentienceToken: state.lastSentienceToken,
        memoryFilter: state.memoryFilter,
        selectedMemoryEvent: state.selectedMemoryEvent,
        captures: state.captures,
        servicesStatus: state.servicesStatus,
      }),
    }
  )
);

// Selectors for better performance
export const useEvents = () => useAppStore((state) => state.events);
export const useLastSentienceToken = () =>
  useAppStore((state) => state.lastSentienceToken);
export const useMemoryEvents = () => useAppStore((state) => state.memoryEvents);
export const useMemoryFilter = () => useAppStore((state) => state.memoryFilter);
export const useSelectedMemoryEvent = () =>
  useAppStore((state) => state.selectedMemoryEvent);
export const useCaptures = () => useAppStore((state) => state.captures);
export const useServicesStatus = () =>
  useAppStore((state) => state.servicesStatus);
export const useIsRecording = () => useAppStore((state) => state.isRecording);
export const useIsProcessing = () => useAppStore((state) => state.isProcessing);
export const useWaypoints = () => useAppStore((state) => state.waypoints);
export const useWaypointA = () => useAppStore((state) => state.waypointA);
export const useWaypointB = () => useAppStore((state) => state.waypointB);

// Action selectors
export const useEventActions = () => {
  const addEvent = useAppStore((state) => state.addEvent);
  const setLastSentienceToken = useAppStore(
    (state) => state.setLastSentienceToken
  );
  return { addEvent, setLastSentienceToken };
};

export const useMemoryActions = () => {
  const addMemoryEvent = useAppStore((state) => state.addMemoryEvent);
  const setMemoryFilter = useAppStore((state) => state.setMemoryFilter);
  const setSelectedMemoryEvent = useAppStore(
    (state) => state.setSelectedMemoryEvent
  );
  return { addMemoryEvent, setMemoryFilter, setSelectedMemoryEvent };
};

export const useCaptureActions = () => {
  const addCapture = useAppStore((state) => state.addCapture);
  const setCaptures = useAppStore((state) => state.setCaptures);
  return { addCapture, setCaptures };
};

export const useServiceActions = () => {
  const updateServicesStatus = useAppStore(
    (state) => state.updateServicesStatus
  );
  return { updateServicesStatus };
};

export const useUIActions = () => {
  const setIsRecording = useAppStore((state) => state.setIsRecording);
  const setIsProcessing = useAppStore((state) => state.setIsProcessing);
  return { setIsRecording, setIsProcessing };
};

export const useWaypointActions = () => {
  const toggleWaypoint = useAppStore((state) => state.toggleWaypoint);
  const setWaypointA = useAppStore((state) => state.setWaypointA);
  const setWaypointB = useAppStore((state) => state.setWaypointB);
  const clearWaypoints = useAppStore((state) => state.clearWaypoints);

  return {
    toggleWaypoint,
    setWaypointA,
    setWaypointB,
    clearWaypoints,
  };
};

export const useCleanupActions = () => {
  const clearAllData = useAppStore((state) => state.clearAllData);
  const clearEvents = useAppStore((state) => state.clearEvents);
  const clearCaptures = useAppStore((state) => state.clearCaptures);

  return {
    clearAllData,
    clearEvents,
    clearCaptures,
  };
};

import { useCallback } from "react";
import { useAppStore } from "../stores/appStore";
import { ServicesStatus } from "../types";

export const useEventStream = () => {
  const addEvent = useAppStore((state) => state.addEvent);
  const setLastSentienceToken = useAppStore(
    (state) => state.setLastSentienceToken
  );
  const updateServicesStatus = useAppStore(
    (state) => state.updateServicesStatus
  );

  const handleEventMessage = useCallback(
    (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data);

        // Handle service status updates
        if (event.type === "service.status") {
          updateServicesStatus((prevStatus: ServicesStatus) => ({
            ...prevStatus,
            [event.service as keyof ServicesStatus]: event.status,
          }));
          return;
        }

        // Handle thought generation events
        if (event.type === "thought.generated") {
          // Dispatch custom event for components to listen to
          const customEvent = new CustomEvent("sse-message", {
            detail: event,
          });
          window.dispatchEvent(customEvent);
          return;
        }

        // Handle experience consolidation events
        if (event.type === "experience.consolidated") {
          const customEvent = new CustomEvent("sse-message", {
            detail: event,
          });
          window.dispatchEvent(customEvent);
          return;
        }

        // Filter out other system events
        if (event.type !== "connection" && event.type !== "ping") {
          addEvent(event);

          // Track last sentience token for Panel B
          if (event.type === "sentience.token") {
            setLastSentienceToken(event);
          } else {
            console.log("Event type is not sentience.token:", event.type);
          }
        }
      } catch (error) {
        console.error("Error parsing SSE event:", error, e.data);
      }
    },
    [addEvent, setLastSentienceToken, updateServicesStatus]
  );

  return {
    handleEventMessage,
  };
};

import { useCallback } from "react";
import { useAppStore } from "../stores/appStore";

export const useEventStream = () => {
  const addEvent = useAppStore((state) => state.addEvent);
  const setLastSentienceToken = useAppStore(
    (state) => state.setLastSentienceToken
  );

  const handleEventMessage = useCallback(
    (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data);
        // Filter out connection and ping events
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
    [addEvent, setLastSentienceToken]
  );

  return {
    handleEventMessage,
  };
};

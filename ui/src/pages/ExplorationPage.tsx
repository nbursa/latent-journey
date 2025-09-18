import { useMemoryEventsRealtime } from "../hooks/useMemoryEventsRealtime";
import { useAudioVisualization } from "../hooks/useAudioVisualization";
import { useMediaRecording } from "../hooks/useMediaRecording";
import { useEventStream } from "../hooks/useEventStream";
import { useAppStore } from "../stores/appStore";
import { useEffect, useMemo } from "react";
import CameraSection from "../components/CameraSection";
import EventsList from "../components/EventsList";
import LatentInsight from "../components/LatentInsight";
import MemoryTimeline from "../components/MemoryTimeline";
import ThoughtStream from "../components/ThoughtStream";
import { Memory } from "../types/memory";
import LTMExperiences from "../components/LTMExperiences";

export default function ExplorationPage() {
  // Get data from Zustand store
  const events = useAppStore((state) => state.events);
  const lastSentienceToken = useAppStore((state) => state.lastSentienceToken);
  const memoryEvents = useAppStore((state) => state.memoryEvents);
  const memoryFilter = useAppStore((state) => state.memoryFilter);
  const selectedMemoryEvent = useAppStore((state) => state.selectedMemoryEvent);
  const setMemoryFilter = useAppStore((state) => state.setMemoryFilter);
  const setSelectedMemoryEvent = useAppStore(
    (state) => state.setSelectedMemoryEvent
  );

  // Custom hooks for state management
  const { loadMemoryEvents } = useMemoryEventsRealtime(); // Real-time memory events
  const {
    audioLevels,
    refs: audioRefs,
    startAudioVisualization,
    stopAudioVisualization,
    initializeIdleVisualization,
  } = useAudioVisualization();
  const {
    isRecording,
    isProcessing,
    refs: mediaRefs,
    snapAndSend,
    startRecording,
    stopRecording,
  } = useMediaRecording(loadMemoryEvents);
  const { handleEventMessage } = useEventStream();

  // Convert memory events to Memory format for ego service
  const memories = useMemo(() => {
    return memoryEvents.map(
      (event): Memory => ({
        id: event.embedding_id,
        timestamp: (() => {
          // Handle different timestamp formats
          let timestamp = event.ts;

          // If timestamp is in seconds (typical Unix timestamp), convert to milliseconds
          if (timestamp < 10000000000) {
            // Less than year 2286 in seconds
            timestamp = timestamp * 1000;
          }

          // If timestamp is still too large, use current time as fallback
          if (timestamp > 4102444800000) {
            // Year 2100 in milliseconds
            timestamp = Date.now();
          }

          try {
            return new Date(timestamp).toISOString();
          } catch (error) {
            console.warn(
              "Invalid timestamp, using current time:",
              event.ts,
              error
            );
            return new Date().toISOString();
          }
        })(),
        modality:
          event.source === "vision"
            ? "vision"
            : event.source === "speech"
            ? "speech"
            : "text",
        embedding: [],
        facets: event.facets,
        content: (() => {
          // Extract content from facets based on source
          if (event.source === "speech" && event.facets["speech.transcript"]) {
            return String(event.facets["speech.transcript"]);
          } else if (
            event.source === "vision" &&
            event.facets["vision.object"]
          ) {
            return `I see a ${String(event.facets["vision.object"])}`;
          } else if (event.source === "text" && event.facets["text.content"]) {
            return String(event.facets["text.content"]);
          }
          return "";
        })(),
        tags: [],
      })
    );
  }, [memoryEvents]);

  // Event handlers
  const handleSnapAndSend = () => {
    snapAndSend();
  };

  const handleStartRecording = () => {
    startRecording(startAudioVisualization);
  };

  const handleStopRecording = () => {
    stopRecording(stopAudioVisualization);
  };

  useEffect(() => {
    // Initialize camera
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
        });

        if (mediaRefs.videoRef.current) {
          mediaRefs.videoRef.current.srcObject = stream;

          // Force video to load and play
          mediaRefs.videoRef.current.load();
          await mediaRefs.videoRef.current.play();
        }
      } catch (error) {
        console.error("Camera initialization error:", error);

        // Retry with simpler constraints for mobile
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });

          if (mediaRefs.videoRef.current) {
            mediaRefs.videoRef.current.srcObject = fallbackStream;
            mediaRefs.videoRef.current.load();
            await mediaRefs.videoRef.current.play();
          }
        } catch (fallbackError) {
          console.error("Fallback camera initialization error:", fallbackError);
        }
      }
    };

    initCamera();

    // Initialize audio visualization
    initializeIdleVisualization();

    // SSE
    const es = new EventSource("/events");
    es.onmessage = handleEventMessage;

    // Memory events are now loaded automatically by useMemoryEventsRealtime hook

    return () => {
      es.close();
      stopAudioVisualization();
      if (audioRefs.animationFrameRef.current) {
        cancelAnimationFrame(audioRefs.animationFrameRef.current);
      }

      // Stop camera stream
      if (mediaRefs.videoRef.current && mediaRefs.videoRef.current.srcObject) {
        const stream = mediaRefs.videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        mediaRefs.videoRef.current.srcObject = null;
      }
    };
  }, [
    handleEventMessage,
    initializeIdleVisualization,
    stopAudioVisualization,
    audioRefs.animationFrameRef,
    mediaRefs.videoRef,
  ]);

  return (
    <>
      {/* Mobile Layout - Stacked Components */}
      <div className="flex-1 flex flex-col gap-4 p-2 sm:p-4 lg:hidden min-h-0 overflow-y-auto">
        <CameraSection
          videoRef={mediaRefs.videoRef}
          canvasRef={mediaRefs.canvasRef}
          audioLevels={audioLevels}
          isRecording={isRecording}
          isProcessing={isProcessing}
          onSnapAndSend={handleSnapAndSend}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
        />

        <LatentInsight
          selectedMemoryEvent={selectedMemoryEvent}
          lastSentienceToken={lastSentienceToken}
        />

        <EventsList events={events} isProcessing={isProcessing} />

        <MemoryTimeline
          memoryEvents={memoryEvents}
          memoryFilter={memoryFilter}
          selectedMemoryEvent={selectedMemoryEvent}
          onSetMemoryFilter={setMemoryFilter}
          onSelectMemoryEvent={setSelectedMemoryEvent}
        />

        <ThoughtStream memories={memories} />

        <LTMExperiences />
      </div>

      {/* Desktop Layout - 4-Column Grid */}
      <div className="hidden lg:grid flex-1 grid-cols-4 p-4 gap-4 min-h-0 h-full overflow-hidden">
        {/* Left Column: Camera + Latent Insight */}
        <div className="flex flex-col min-h-0 max-h-full gap-4">
          <div className="flex-shrink-0">
            <CameraSection
              videoRef={mediaRefs.videoRef}
              canvasRef={mediaRefs.canvasRef}
              audioLevels={audioLevels}
              isRecording={isRecording}
              isProcessing={isProcessing}
              onSnapAndSend={handleSnapAndSend}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
            />
          </div>

          <div className="flex-1 min-h-0">
            <LatentInsight
              selectedMemoryEvent={selectedMemoryEvent}
              lastSentienceToken={lastSentienceToken}
            />
          </div>
        </div>

        {/* Second Column: Events */}
        <div className="flex flex-col min-h-0 max-h-full gap-4">
          <div className="flex-1 min-h-0">
            <EventsList events={events} isProcessing={isProcessing} />
          </div>
          <div className="flex-1 min-h-0">
            <MemoryTimeline
              memoryEvents={memoryEvents}
              memoryFilter={memoryFilter}
              selectedMemoryEvent={selectedMemoryEvent}
              onSetMemoryFilter={setMemoryFilter}
              onSelectMemoryEvent={setSelectedMemoryEvent}
            />
          </div>
        </div>

        {/* Third Column: Memory */}
        <div className="flex flex-col min-h-0 max-h-full gap-4">
          <div className="flex-1 min-h-0">
            <ThoughtStream memories={memories} />
          </div>
        </div>

        {/* Right Column: Thought Stream Only */}
        <div className="flex flex-col min-h-0 max-h-full gap-4">
          <div className="flex-1 min-h-0">
            <LTMExperiences />
          </div>
        </div>
      </div>
    </>
  );
}

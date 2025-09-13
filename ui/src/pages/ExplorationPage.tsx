import { useMemoryEventsRealtime } from "../hooks/useMemoryEventsRealtime";
import { useAudioVisualization } from "../hooks/useAudioVisualization";
import { useMediaRecording } from "../hooks/useMediaRecording";
import { useEventStream } from "../hooks/useEventStream";
import { useAppStore } from "../stores/appStore";
import { useEffect } from "react";
import CameraSection from "../components/CameraSection";
import EventsList from "../components/EventsList";
import LatentInsight from "../components/LatentInsight";
import MemoryTimeline from "../components/MemoryTimeline";

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
    (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (mediaRefs.videoRef.current)
        mediaRefs.videoRef.current.srcObject = stream;
    })();

    // Initialize audio visualization with dummy data
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
    };
  }, [
    handleEventMessage,
    initializeIdleVisualization,
    stopAudioVisualization,
    audioRefs.animationFrameRef,
    mediaRefs.videoRef,
  ]);

  return (
    <div className="flex-1 flex flex-col xl:flex-row gap-4 p-4 min-h-0 max-h-full">
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

      <div className="flex-1 flex flex-col min-h-0 max-h-full">
        <EventsList events={events} isProcessing={isProcessing} />
      </div>

      <div className="flex-1 flex flex-col min-h-0 max-h-full">
        <MemoryTimeline
          memoryEvents={memoryEvents}
          memoryFilter={memoryFilter}
          selectedMemoryEvent={selectedMemoryEvent}
          onSetMemoryFilter={setMemoryFilter}
          onSelectMemoryEvent={setSelectedMemoryEvent}
        />
      </div>

      <div className="flex-1 flex flex-col">
        <LatentInsight
          selectedMemoryEvent={selectedMemoryEvent}
          lastSentienceToken={lastSentienceToken}
        />
      </div>
    </div>
  );
}

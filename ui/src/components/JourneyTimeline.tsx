import { useState, useMemo, useEffect, useRef } from "react";
import { MemoryEvent } from "../types";
import { Clock, Play, Pause, RotateCcw } from "lucide-react";

interface JourneyTimelineProps {
  memoryEvents: MemoryEvent[];
  selectedEvent: MemoryEvent | null;
  onSelectEvent: (event: MemoryEvent) => void;
  className?: string;
}

export default function JourneyTimeline({
  memoryEvents,
  selectedEvent,
  onSelectEvent,
  className = "",
}: JourneyTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const isSyncingRef = useRef(false);

  // Sort events by timestamp
  const sortedEvents = useMemo(() => {
    return [...memoryEvents].sort((a, b) => a.ts - b.ts);
  }, [memoryEvents]);

  // Calculate time range
  const timeRange = useMemo(() => {
    if (sortedEvents.length === 0) return { start: 0, end: 0, duration: 0 };

    const start = sortedEvents[0].ts;
    const end = sortedEvents[sortedEvents.length - 1].ts;
    const duration = end - start;

    return { start, end, duration };
  }, [sortedEvents]);

  // Get current event based on playback position
  const currentEvent = useMemo(() => {
    if (sortedEvents.length === 0) return null;

    const targetTime =
      timeRange.duration === 0
        ? timeRange.start
        : timeRange.start + currentTime * timeRange.duration;

    // Find the closest event to the target time
    let closestEvent = sortedEvents[0];
    let minDistance = Math.abs(sortedEvents[0].ts - targetTime);

    for (const event of sortedEvents) {
      const distance = Math.abs(event.ts - targetTime);
      if (distance < minDistance) {
        minDistance = distance;
        closestEvent = event;
      }
    }

    return closestEvent;
  }, [sortedEvents, currentTime, timeRange]);

  // Playback controls
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleSeek = (time: number) => {
    setCurrentTime(Math.max(0, Math.min(1, time)));
  };

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const newTime = prev + 0.01 * playbackSpeed;
        if (newTime >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Select current event when it changes
  useEffect(() => {
    if (
      currentEvent &&
      currentEvent.ts !== selectedEvent?.ts &&
      !isSyncingRef.current
    ) {
      onSelectEvent(currentEvent);
    }
  }, [currentEvent?.ts, selectedEvent?.ts, onSelectEvent]);

  // Sync timeline position when selectedEvent changes (from other views)
  useEffect(() => {
    if (
      !selectedEvent ||
      sortedEvents.length === 0 ||
      timeRange.duration === 0 ||
      isSyncingRef.current
    )
      return;

    const pos = (selectedEvent.ts - timeRange.start) / timeRange.duration;
    const newTime = Math.max(0, Math.min(1, pos));

    // Only update if significantly different to avoid ping-pong
    if (Math.abs(newTime - currentTime) > 1e-3) {
      isSyncingRef.current = true;
      setCurrentTime(newTime);
      // Reset the flag after a short delay
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    }
  }, [
    selectedEvent?.ts,
    sortedEvents.length,
    timeRange.start,
    timeRange.duration,
    currentTime,
  ]);

  if (sortedEvents.length === 0) {
    return (
      <div className={`glass flat p-4 ${className}`}>
        <div className="text-center text-ui-dim">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <div className="text-sm">No timeline data</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass flat p-4 space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-ui-accent flex items-center gap-1">
          <Clock className="w-4 h-4" />
          Journey Timeline
        </h3>
        <div className="text-xs text-ui-dim">{sortedEvents.length} events</div>
      </div>

      {/* Timeline */}
      <div className="space-y-2">
        {/* Time labels */}
        <div className="flex justify-between text-xs text-ui-dim">
          <span>{new Date(timeRange.start * 1000).toLocaleTimeString()}</span>
          <span>{new Date(timeRange.end * 1000).toLocaleTimeString()}</span>
        </div>

        {/* Timeline track */}
        <div className="relative">
          <div className="h-2 bg-ui-surface rounded-full overflow-hidden">
            {/* Progress bar */}
            <div
              className="h-full bg-gradient-to-r from-ui-accent to-ui-accent-2 transition-all duration-100"
              style={{ width: `${currentTime * 100}%` }}
            />
          </div>

          {/* Event markers */}
          <div className="absolute top-0 left-0 w-full h-2">
            {sortedEvents.map((event, index) => {
              const safePos =
                timeRange.duration === 0
                  ? 0
                  : (event.ts - timeRange.start) / timeRange.duration;
              const position = Math.max(0, Math.min(1, safePos));
              const isSelected = selectedEvent?.ts === event.ts;

              return (
                <button
                  key={`timeline-${event.ts}-${
                    event.embedding_id || "default"
                  }-${event.source}-${index}`}
                  onClick={() => {
                    setIsPlaying(false);
                    handleSeek(position);
                    onSelectEvent(event);
                  }}
                  className={`absolute top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full transition-all ${
                    isSelected
                      ? "bg-ui-accent scale-125 ring-2 ring-ui-accent ring-offset-1 ring-offset-ui-bg"
                      : "bg-ui-text hover:bg-ui-accent hover:scale-110"
                  }`}
                  style={{ left: `${position * 100}%` }}
                  title={`${event.source} - ${new Date(
                    event.ts * 1000
                  ).toLocaleTimeString()}`}
                />
              );
            })}
          </div>

          {/* Current position indicator */}
          <div
            className="absolute top-1/2 transform -translate-y-1/2 w-1 h-4 bg-white rounded-full shadow-lg"
            style={{ left: `${currentTime * 100}%` }}
          />
        </div>

        {/* Current event info */}
        {currentEvent && (
          <div className="text-xs text-ui-text">
            <div className="font-medium">
              {currentEvent.source.toUpperCase()}
            </div>
            <div className="text-ui-dim">
              {new Date(currentEvent.ts * 1000).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePlayPause}
          className="p-1 flat btn-secondary"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={handleReset}
          className="p-1 flat btn-secondary"
          title="Reset"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {/* Speed control */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-ui-dim">Speed:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="text-xs btn-primary px-1 py-0.5"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </div>
      </div>

      {/* Event list */}
      <div className="space-y-1">
        {sortedEvents.slice(0, 10).map((event, index) => {
          const isSelected = selectedEvent?.ts === event.ts;
          const safePos =
            timeRange.duration === 0
              ? 0
              : (event.ts - timeRange.start) / timeRange.duration;
          const position = Math.max(0, Math.min(1, safePos));

          return (
            <button
              key={`list-${event.ts}-${event.embedding_id || "default"}-${
                event.source
              }-${index}`}
              onClick={() => {
                setIsPlaying(false);
                handleSeek(position);
                onSelectEvent(event);
              }}
              className={`w-full text-left p-2 flat ${
                isSelected ? "btn-primary" : "btn-secondary"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    event.source === "vision"
                      ? "bg-ui-accent"
                      : "bg-ui-accent-2"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">
                    {event.source.toUpperCase()}
                  </div>
                  <div className="text-xs text-ui-dim">
                    {new Date(event.ts * 1000).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-xs text-ui-dim">
                  {Math.round(position * 100)}%
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

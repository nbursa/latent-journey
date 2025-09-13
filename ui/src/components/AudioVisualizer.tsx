interface AudioVisualizerProps {
  audioLevels: number[];
  isRecording: boolean;
}

export default function AudioVisualizer({
  audioLevels,
  isRecording,
}: AudioVisualizerProps) {
  return (
    <div className="glass flat p-3 mt-2">
      <div className="text-xs text-gray-300 mb-2">
        Audio Level {isRecording ? "(Recording)" : "(Idle)"}
      </div>
      <div className="flex items-end gap-1 h-12">
        {audioLevels.slice(0, 32).map((level, index) => (
          <div
            key={index}
            className={`flex-1 transition-all duration-75 ${
              isRecording
                ? "bg-gradient-to-t from-blue-500 to-purple-500"
                : "bg-gradient-to-t from-gray-600 to-gray-500"
            }`}
            style={{
              height: `${Math.max(level * 100, 2)}%`,
              opacity: level > 0.1 ? 1 : 0.3,
            }}
          />
        ))}
      </div>
      <div className="text-xs text-gray-400 mt-1">
        {isRecording
          ? `Peak: ${(Math.max(...audioLevels) * 100).toFixed(1)}%`
          : "Click 'Start Recording' to see audio levels"}
      </div>
    </div>
  );
}

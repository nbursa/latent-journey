import AudioVisualizer from "./AudioVisualizer";
import { Camera, Mic, Square } from "lucide-react";

interface CameraSectionProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  audioLevels: number[];
  isRecording: boolean;
  isProcessing: boolean;
  onSnapAndSend: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export default function CameraSection({
  videoRef,
  canvasRef,
  audioLevels,
  isRecording,
  isProcessing,
  onSnapAndSend,
  onStartRecording,
  onStopRecording,
}: CameraSectionProps) {
  return (
    <div className="flex flex-col min-h-0">
      <h2 className="text-base sm:text-lg font-semibold mb-2 flex items-center gap-2">
        <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="hidden sm:inline">Live Camera</span>
        <span className="sm:hidden">Camera</span>
      </h2>
      <div className="flex flex-col min-h-0">
        <div
          className="relative w-full flat glass-border flex-shrink-0"
          style={{
            aspectRatio: "16/9",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
            style={{
              backgroundColor: "#000",
            }}
            onError={(e) => {
              console.error("Video error:", e);
            }}
          />
          <div className="absolute inset-0 flex items-end justify-start">
            <div className="text-left bg-gray-900/50 p-1 sm:p-2">
              <div className="text-[10px] text-gray-300">Camera Ready</div>
            </div>
          </div>
        </div>

        <AudioVisualizer audioLevels={audioLevels} isRecording={isRecording} />

        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <button
            onClick={onSnapAndSend}
            disabled={isProcessing}
            className={`btn btn-primary flex-1 text-xs sm:text-sm flat hover-glow hover-scale flex items-center justify-center gap-1 sm:gap-2 ${
              isProcessing ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Camera className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">
              {isProcessing ? "Processing..." : "Capture & Analyze"}
            </span>
            <span className="sm:hidden">
              {isProcessing ? "Processing..." : "Capture"}
            </span>
          </button>
          <button
            onClick={isRecording ? onStopRecording : onStartRecording}
            disabled={isProcessing}
            className={`btn ${
              isRecording ? "btn-danger" : "btn-secondary"
            } flex-1 text-xs sm:text-sm flat hover-glow hover-scale flex items-center justify-center gap-1 sm:gap-2 ${
              isProcessing ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Stop Recording</span>
                <span className="sm:hidden">Stop</span>
              </>
            ) : (
              <>
                <Mic className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Start Recording</span>
                <span className="sm:hidden">Record</span>
              </>
            )}
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}

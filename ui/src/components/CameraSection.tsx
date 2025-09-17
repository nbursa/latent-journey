import AudioVisualizer from "./AudioVisualizer";
import { Camera, Mic, Square } from "lucide-react";

interface CameraSectionProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
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
      <div className="flex-1 flex flex-col min-h-0">
        <div className="relative w-full flat glass-border flex-shrink-0 min-h-0 aspect-video sm:aspect-auto">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 p-1 sm:p-2 flex items-end justify-start bg-gray-900/50">
            <div className="text-left">
              <div className="text-xs sm:text-sm text-gray-300 mb-1 sm:mb-2">
                Camera Ready
              </div>
              <div className="text-xs text-gray-400 hidden sm:block">
                Click "Capture & Analyze" to take photos
              </div>
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

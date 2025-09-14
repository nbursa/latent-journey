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
      <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <Camera className="w-5 h-5" />
        Live Camera
      </h2>
      <div className="flex-1 flex flex-col min-h-0">
        <div className="relative w-full flat glass-border flex-shrink-0 min-h-0">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-auto object-cover"
          />
          <div className="absolute inset-0 p-2 flex items-end justify-start bg-gray-900/50">
            <div className="text-left">
              <div className="text-sm text-gray-300 mb-2">Camera Ready</div>
              <div className="text-xs text-gray-400">
                Click "Capture & Analyze" to take photos
              </div>
            </div>
          </div>
        </div>

        <AudioVisualizer audioLevels={audioLevels} isRecording={isRecording} />

        <div className="flex gap-2 mt-2">
          <button
            onClick={onSnapAndSend}
            disabled={isProcessing}
            className={`btn btn-primary flex-1 text-sm flat hover-glow hover-scale flex items-center justify-center gap-2 ${
              isProcessing ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Camera className="w-4 h-4" />
            {isProcessing ? "Processing..." : "Capture & Analyze"}
          </button>
          <button
            onClick={isRecording ? onStopRecording : onStartRecording}
            disabled={isProcessing}
            className={`btn ${
              isRecording ? "btn-danger" : "btn-secondary"
            } flex-1 text-sm flat hover-glow hover-scale flex items-center justify-center gap-2 ${
              isProcessing ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-4 h-4" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Start Recording
              </>
            )}
          </button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";

interface Event {
  type: string;
  message?: string;
  clip_topk?: Array<{ label: string; score: number }>;
  transcript?: string;
  confidence?: number;
  language?: string;
  embedding_id?: string;
  ts?: number;
  facets?: Record<string, string | number>;
}

export default function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [captures, setCaptures] = useState<string[]>([]);
  const [lastSentienceToken, setLastSentienceToken] = useState<Event | null>(
    null
  );
  const [servicesStatus, setServicesStatus] = useState({
    gateway: "unknown",
    ml: "unknown",
    sentience: "unknown",
  });
  const [audioLevels, setAudioLevels] = useState<number[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Check services status
  const checkServices = async () => {
    try {
      // Check Gateway
      const gatewayResponse = await fetch("/ping");
      setServicesStatus((prev) => ({
        ...prev,
        gateway: gatewayResponse.ok ? "online" : "offline",
      }));
    } catch (error) {
      setServicesStatus((prev) => ({ ...prev, gateway: "offline" }));
    }

    try {
      // Check ML Service
      const mlResponse = await fetch("/ml/ping");
      setServicesStatus((prev) => ({
        ...prev,
        ml: mlResponse.ok ? "online" : "offline",
      }));
    } catch (error) {
      setServicesStatus((prev) => ({ ...prev, ml: "offline" }));
    }

    try {
      // Check Sentience Service
      const sentienceResponse = await fetch("/sentience/ping");
      setServicesStatus((prev) => ({
        ...prev,
        sentience: sentienceResponse.ok ? "online" : "offline",
      }));
    } catch (error) {
      setServicesStatus((prev) => ({ ...prev, sentience: "offline" }));
    }
  };

  useEffect(() => {
    // camera
    (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    })();

    // Initialize audio visualization with dummy data
    const initializeAudioVisualization = () => {
      // Create a simple animated pattern when no audio is available
      const animateIdle = () => {
        const dummyLevels = Array.from(
          { length: 32 },
          () => Math.random() * 0.1
        );
        setAudioLevels(dummyLevels);
        animationFrameRef.current = requestAnimationFrame(animateIdle);
      };
      animateIdle();
    };

    initializeAudioVisualization();

    // SSE
    const es = new EventSource("/events");
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        // Filter out connection and ping events
        if (event.type !== "connection" && event.type !== "ping") {
          setEvents((prev) => [event, ...prev].slice(0, 50));

          // Track last sentience token for Panel B
          if (event.type === "sentience.token") {
            setLastSentienceToken(event);
          }
        }
      } catch {
        /* ignore */
      }
    };

    // Check services immediately and then every 30 seconds
    checkServices();
    const statusInterval = setInterval(checkServices, 30000); // Check every 30 seconds

    return () => {
      es.close();
      clearInterval(statusInterval);
      stopAudioVisualization();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const snapAndSend = async () => {
    setIsProcessing(true);

    // Check services status when user interacts
    checkServices();

    const v = videoRef.current;
    const c = canvasRef.current;

    if (!v) {
      setIsProcessing(false);
      return;
    }

    if (!c) {
      setIsProcessing(false);
      return;
    }

    if (v.videoWidth === 0 || v.videoHeight === 0) {
      setIsProcessing(false);
      return;
    }

    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");

    if (!ctx) {
      setIsProcessing(false);
      return;
    }

    ctx.drawImage(v, 0, 0, c.width, c.height);
    const b64 = c.toDataURL("image/jpeg");
    setCaptures((prev) => [b64, ...prev].slice(0, 10)); // Keep last 10 captures

    try {
      const response = await fetch("/api/vision/frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: b64 }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
    } catch (error) {
      console.error("Error sending image:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const startAudioVisualization = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVisualization = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);

          // Convert to normalized levels (0-1)
          const levels = Array.from(dataArray).map((value) => value / 255);
          setAudioLevels(levels);

          // Continue animation even when not recording
          animationFrameRef.current =
            requestAnimationFrame(updateVisualization);
        }
      };

      updateVisualization();
    } catch (error) {
      console.error("Error setting up audio visualization:", error);
    }
  };

  const stopAudioVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setAudioLevels([]);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Start audio visualization
      startAudioVisualization(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stopAudioVisualization();

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm;codecs=opus",
        });

        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          await sendAudioToAPI(base64);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopAudioVisualization();
    }
  };

  const sendAudioToAPI = async (audioBase64: string) => {
    setIsProcessing(true);

    try {
      const response = await fetch("/api/speech/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio_base64: audioBase64 }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
    } catch (error) {
      console.error("Error sending audio:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col text-white animated-bg">
      {/* Header */}
      <div className="flex-shrink-0 p-4">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-gradient text-glow">
          Latent Journey
        </h1>

        {/* Services Status and Audio Visualizer */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Services Status */}
          <div className="w-fit glass flat p-3 flex-shrink-0">
            <h3 className="text-sm font-semibold mb-2">Services Status</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`status-dot ${
                    servicesStatus.gateway === "online"
                      ? "online"
                      : servicesStatus.gateway === "offline"
                      ? "offline"
                      : "unknown"
                  }`}
                />
                <span className="text-xs">Gateway</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`status-dot ${
                    servicesStatus.ml === "online"
                      ? "online"
                      : servicesStatus.ml === "offline"
                      ? "offline"
                      : "unknown"
                  }`}
                />
                <span className="text-xs">ML Service</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`status-dot ${
                    servicesStatus.sentience === "online"
                      ? "online"
                      : servicesStatus.sentience === "offline"
                      ? "offline"
                      : "unknown"
                  }`}
                />
                <span className="text-xs">Sentience</span>
              </div>
            </div>
          </div>

          {/* Audio Visualizer - Always Visible */}
          <div className="w-full sm:w-64 glass flat p-3 flex-shrink-0">
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

          {/* Captures - Always visible with placeholder text */}
          <div className="flex-1 min-w-0 glass flat p-3">
            <h3 className="text-sm font-semibold mb-2">
              Captures ({captures.length})
            </h3>
            {captures.length > 0 ? (
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                <div className="flex gap-2 min-w-max">
                  {captures.map((capture, index) => (
                    <img
                      key={index}
                      src={capture}
                      alt={`Capture ${index + 1}`}
                      className="h-16 w-auto flat glass-border object-cover flex-shrink-0 hover-scale"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-400">
                Click "Capture & Analyze" to take photos
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 min-h-0">
        {/* Camera Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <h2 className="text-lg font-semibold mb-2">Live Camera</h2>
          <div className="flex-1 flex flex-col min-h-0">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full flat glass-border object-cover flex-1 min-h-0"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={snapAndSend}
                disabled={isProcessing}
                className={`btn btn-primary flex-1 text-sm flat hover-glow hover-scale ${
                  isProcessing ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isProcessing ? "Processing..." : "Capture & Analyze"}
              </button>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`btn ${
                  isRecording ? "btn-danger" : "btn-secondary"
                } flex-1 text-sm flat hover-glow hover-scale ${
                  isProcessing ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isRecording ? "Stop Recording" : "Start Recording"}
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>

        {/* Events Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Events</h2>
            {isProcessing && (
              <div className="flex items-center gap-2 text-green-400">
                <div className="status-dot online" />
                <span className="text-xs">Processing...</span>
              </div>
            )}
          </div>
          <div className="glass flat p-3 flex-1 overflow-auto min-h-0">
            {events.length === 0 ? (
              <div className="text-gray-400 text-sm">No events yet...</div>
            ) : (
              <div className="space-y-3">
                {events.map((event, index) => (
                  <div
                    key={index}
                    className="border-b border-white/10 pb-3 last:border-b-0"
                  >
                    <div className="text-sm font-semibold text-blue-300 mb-2">
                      {event.type}
                    </div>
                    {event.clip_topk && (
                      <div className="space-y-2">
                        <div className="text-xs text-gray-300 mb-2">
                          CLIP Results:
                        </div>
                        {event.clip_topk.map((item, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-white min-w-0 flex-1 truncate">
                              {item.label}
                            </span>
                            <div className="flex-1 progress-bar">
                              <div
                                className={`progress-fill ${
                                  isProcessing ? "animating" : ""
                                }`}
                                style={{ width: `${item.score * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400 min-w-0">
                              {(item.score * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {event.transcript && (
                      <div className="space-y-2">
                        <div className="text-xs text-gray-300 mb-2">
                          Speech Transcript:
                        </div>
                        <div className="text-xs text-white bg-gray-800/50 p-2 rounded">
                          "{event.transcript}"
                        </div>
                        {event.confidence && (
                          <div className="text-xs text-gray-400">
                            Confidence: {(event.confidence * 100).toFixed(1)}%
                          </div>
                        )}
                        {event.language && (
                          <div className="text-xs text-gray-400">
                            Language: {event.language}
                          </div>
                        )}
                      </div>
                    )}
                    {event.message && (
                      <div className="text-xs text-gray-300 mt-2">
                        {event.message}
                      </div>
                    )}
                    {event.embedding_id && (
                      <div className="text-xs text-gray-400 mt-1">
                        Embedding: {event.embedding_id}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel B: Latent Insight */}
        <div className="flex-1 flex flex-col min-h-0">
          <h2 className="text-lg font-semibold mb-2">Latent Insight</h2>
          <div className="glass flat p-3 flex-shrink-0 overflow-auto min-h-0">
            {lastSentienceToken ? (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-300 mb-2">
                  {lastSentienceToken.type}
                </div>
                <div className="text-xs text-gray-400 mb-3">
                  Embedding: {lastSentienceToken.embedding_id}
                </div>
                {lastSentienceToken.facets && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-300 mb-2">Facets:</div>
                    {Object.entries(lastSentienceToken.facets).map(
                      ([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-xs text-white min-w-0 flex-1 truncate">
                            {key}:
                          </span>
                          {key === "affect.valence" &&
                          typeof value === "number" ? (
                            <div className="flex-1 flex items-center gap-2">
                              <div className="flex-1 progress-bar">
                                <div
                                  className="progress-fill"
                                  style={{
                                    width: `${((value + 1) / 2) * 100}%`,
                                    background:
                                      value >= 0
                                        ? "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))"
                                        : "linear-gradient(90deg, var(--accent-secondary), var(--accent-primary))",
                                  }}
                                />
                              </div>
                              <span className="text-xs text-gray-400 min-w-0">
                                {value.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300 min-w-0">
                              {String(value)}
                            </span>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-400 text-sm">
                No sentience tokens yet...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

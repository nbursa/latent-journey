import { useEffect, useRef, useState } from "react";

interface Event {
  type: string;
  message?: string;
  clip_topk?: Array<{ label: string; score: number }>;
  embedding_id?: string;
}

export default function App() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [captures, setCaptures] = useState<string[]>([]);
  const [servicesStatus, setServicesStatus] = useState({
    gateway: "unknown",
    ml: "unknown",
    sentience: "unknown",
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Check services status
  const checkServices = async () => {
    console.log("Checking services status...");

    try {
      // Check Gateway
      console.log("Checking Gateway...");
      const gatewayResponse = await fetch("/ping");
      console.log("Gateway response:", gatewayResponse.status);
      setServicesStatus((prev) => ({
        ...prev,
        gateway: gatewayResponse.ok ? "online" : "offline",
      }));
    } catch (error) {
      console.log("Gateway error:", error);
      setServicesStatus((prev) => ({ ...prev, gateway: "offline" }));
    }

    try {
      // Check ML Service
      console.log("Checking ML Service...");
      const mlResponse = await fetch("/ml/ping");
      console.log("ML response:", mlResponse.status);
      setServicesStatus((prev) => ({
        ...prev,
        ml: mlResponse.ok ? "online" : "offline",
      }));
    } catch (error) {
      console.log("ML error:", error);
      setServicesStatus((prev) => ({ ...prev, ml: "offline" }));
    }

    try {
      // Check Sentience Service
      console.log("Checking Sentience Service...");
      const sentienceResponse = await fetch("/sentience/ping");
      console.log("Sentience response:", sentienceResponse.status);
      setServicesStatus((prev) => ({
        ...prev,
        sentience: sentienceResponse.ok ? "online" : "offline",
      }));
    } catch (error) {
      console.log("Sentience error:", error);
      setServicesStatus((prev) => ({ ...prev, sentience: "offline" }));
    }

    console.log("Services status check complete");
  };

  useEffect(() => {
    // camera
    (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    })();

    // SSE
    const es = new EventSource("/events");
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        // Filter out connection and ping events
        if (event.type !== "connection" && event.type !== "ping") {
          setEvents((prev) => [event, ...prev].slice(0, 50));
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
    };
  }, []);

  const snapAndSend = async () => {
    console.log("Button clicked!");
    setIsProcessing(true);

    // Check services status when user interacts
    checkServices();

    const v = videoRef.current;
    const c = canvasRef.current;

    if (!v) {
      console.error("Video element not found");
      setIsProcessing(false);
      return;
    }

    if (!c) {
      console.error("Canvas element not found");
      setIsProcessing(false);
      return;
    }

    if (v.videoWidth === 0 || v.videoHeight === 0) {
      console.error(
        "Video not ready - dimensions:",
        v.videoWidth,
        v.videoHeight
      );
      setIsProcessing(false);
      return;
    }

    console.log("Video dimensions:", v.videoWidth, v.videoHeight);

    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");

    if (!ctx) {
      console.error("Could not get canvas context");
      setIsProcessing(false);
      return;
    }

    ctx.drawImage(v, 0, 0, c.width, c.height);
    const b64 = c.toDataURL("image/jpeg");
    setCaptures((prev) => [b64, ...prev].slice(0, 10)); // Keep last 10 captures

    console.log("Image captured, sending to API...");

    try {
      const response = await fetch("/api/vision/frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: b64 }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("API response:", result);
    } catch (error) {
      console.error("Error sending image:", error);
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

        {/* Services Status and Last Capture */}
        <div className="flex flex-col lg:flex-row gap-4">
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

          {/* Captures - Only on wider screens */}
          {captures.length > 0 && (
            <div className="hidden lg:block flex-1 min-w-0">
              <div className="glass flat p-3 h-full">
                <h3 className="text-sm font-semibold mb-2">
                  Captures ({captures.length})
                </h3>
                <div className="overflow-x-auto">
                  <div className="flex gap-2">
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
              </div>
            </div>
          )}
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
            <button
              onClick={snapAndSend}
              disabled={isProcessing}
              className={`btn btn-primary w-full mt-2 text-sm flat hover-glow hover-scale ${
                isProcessing ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isProcessing ? "Processing..." : "Capture & Analyze"}
            </button>
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
      </div>
    </div>
  );
}

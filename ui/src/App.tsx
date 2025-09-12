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
        setEvents((prev) => [JSON.parse(e.data), ...prev].slice(0, 50));
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
    <div className="h-screen w-screen flex flex-col text-white bg-gradient-to-br from-indigo-500 to-purple-600">
      {/* Header */}
      <div className="flex-shrink-0 p-4">
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">Latent Journey</h1>

        {/* Services Status and Last Capture */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Services Status */}
          <div className="w-fit glass rounded-lg p-3 flex-shrink-0">
            <h3 className="text-sm font-semibold mb-2">Services Status</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    servicesStatus.gateway === "online"
                      ? "bg-green-400"
                      : servicesStatus.gateway === "offline"
                      ? "bg-red-400"
                      : "bg-yellow-400"
                  }`}
                />
                <span className="text-xs">Gateway</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    servicesStatus.ml === "online"
                      ? "bg-green-400"
                      : servicesStatus.ml === "offline"
                      ? "bg-red-400"
                      : "bg-yellow-400"
                  }`}
                />
                <span className="text-xs">ML Service</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    servicesStatus.sentience === "online"
                      ? "bg-green-400"
                      : servicesStatus.sentience === "offline"
                      ? "bg-red-400"
                      : "bg-yellow-400"
                  }`}
                />
                <span className="text-xs">Sentience</span>
              </div>
            </div>
          </div>

          {/* Captures - Only on wider screens */}
          {captures.length > 0 && (
            <div className="hidden lg:block flex-1 min-w-0">
              <div className="glass rounded-lg p-3 h-full">
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
                        className="h-16 w-auto rounded border border-white/20 object-cover flex-shrink-0"
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
              className="w-full rounded-lg object-cover flex-1 min-h-0"
            />
            <button
              onClick={snapAndSend}
              disabled={isProcessing}
              className={`btn btn-primary w-full mt-2 text-sm py-2 px-4 lg:py-3 lg:px-6 ${
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
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs">Processing...</span>
              </div>
            )}
          </div>
          <pre className="glass rounded-lg p-3 flex-1 overflow-auto whitespace-pre-wrap text-xs min-h-0">
            {JSON.stringify(events, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

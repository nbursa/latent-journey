import { useAppStore } from "../stores/appStore";
import { useState, useEffect } from "react";
import { Activity, Cpu, Database, Wifi } from "lucide-react";

interface StatusBarProps {
  className?: string;
}

export default function StatusBar({ className = "" }: StatusBarProps) {
  const events = useAppStore((state) => state.events);
  const memoryEvents = useAppStore((state) => state.memoryEvents);
  // const servicesStatus = useAppStore((state) => state.servicesStatus);

  const [fps, setFps] = useState(60);
  const [gpuInfo, setGpuInfo] = useState<string>("Unknown");
  const [isStreaming, setIsStreaming] = useState(false);

  // Simulate FPS monitoring
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const updateFPS = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (currentTime - lastTime)));
        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(updateFPS);
    };

    requestAnimationFrame(updateFPS);
  }, []);

  // Simulate GPU detection
  useEffect(() => {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

    if (gl && "getExtension" in gl) {
      // Try the new RENDERER parameter first, fallback to deprecated method
      try {
        const renderer = (gl as WebGLRenderingContext).getParameter(
          37445 // RENDERER constant
        );
        setGpuInfo(renderer.split(" ")[0] || "WebGL");
      } catch (error) {
        // Fallback to deprecated method for older browsers
        const debugInfo = (gl as WebGLRenderingContext).getExtension(
          "WEBGL_debug_renderer_info"
        );
        if (debugInfo) {
          const renderer = (gl as WebGLRenderingContext).getParameter(
            debugInfo.UNMASKED_RENDERER_WEBGL
          );
          setGpuInfo(renderer.split(" ")[0] || "WebGL");
        } else {
          setGpuInfo("WebGL");
        }
      }
    } else {
      setGpuInfo("No WebGL");
    }
  }, []);

  // Monitor streaming state
  useEffect(() => {
    const hasRecentEvents = events.some(
      (event) => event.ts && Date.now() / 1000 - event.ts < 5
    );
    setIsStreaming(hasRecentEvents);
  }, [events]);

  // const getServiceStatus = (service: string) => {
  //   const status = servicesStatus[service as keyof typeof servicesStatus];
  //   return status === "online"
  //     ? "online"
  //     : status === "offline"
  //     ? "offline"
  //     : "unknown";
  // };

  return (
    <div
      className={`fixed bottom-4 right-4 w-fit z-50 flex items-center gap-3 ${className}`}
    >
      {/* FPS Counter */}
      <div className="glass flat p-2 flex items-center gap-2">
        <Activity className="w-3 h-3" />
        <span className="font-mono text-xs">{fps} FPS</span>
      </div>

      {/* Points Counter */}
      <div className="glass flat p-2 flex items-center gap-2">
        <Database className="w-3 h-3" />
        <span className="font-mono text-xs">{memoryEvents.length} points</span>
      </div>

      {/* GPU/CPU Info */}
      <div className="glass flat p-2 flex items-center gap-2">
        <Cpu className="w-3 h-3" />
        <span className="font-mono text-xs">{gpuInfo}</span>
      </div>

      {/* Stream Status */}
      <div className="glass flat p-2 flex items-center gap-2">
        <Wifi
          className={`w-3 h-3 status-indicator ${
            isStreaming ? "online" : "offline"
          }`}
        />
        <span className="font-mono text-xs">
          {isStreaming ? "LIVE" : "IDLE"}
        </span>
      </div>

      {/* Service Status Dots */}
      {/* <div className="card p-2 flex items-center gap-1">
        {Object.entries(servicesStatus).map(([service, status]) => (
          <div
            key={service}
            className={`status-dot ${getServiceStatus(service)}`}
            title={`${service}: ${status}`}
          />
        ))}
      </div> */}
    </div>
  );
}

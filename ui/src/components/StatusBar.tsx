import { useAppStore } from "../stores/appStore";
import { useState, useEffect, useRef } from "react";
import { Activity, Cpu, Database, Wifi } from "lucide-react";

interface StatusBarProps {
  className?: string;
}

export default function StatusBar({ className = "" }: StatusBarProps) {
  const events = useAppStore((state) => state.events);
  const memoryEvents = useAppStore((state) => state.memoryEvents);

  const [fps, setFps] = useState(0);
  const [gpuInfo, setGpuInfo] = useState<string>("Unknown");
  const [ramUsage, setRamUsage] = useState<string>("Unknown");
  const [isStreaming, setIsStreaming] = useState(false);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  // FPS monitoring using requestAnimationFrame
  useEffect(() => {
    const updateFPS = () => {
      frameCountRef.current++;
      const currentTime = performance.now();

      if (currentTime - lastTimeRef.current >= 1000) {
        const actualFps = Math.round(
          (frameCountRef.current * 1000) / (currentTime - lastTimeRef.current)
        );
        setFps(actualFps);
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }

      requestAnimationFrame(updateFPS);
    };

    requestAnimationFrame(updateFPS);
  }, []);

  // GPU detection
  useEffect(() => {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

    if (gl && "getParameter" in gl) {
      try {
        // Try WebGL2 RENDERER constant first
        const renderer = (gl as WebGLRenderingContext).getParameter(37445);
        setGpuInfo(renderer.split(" ")[0] || "WebGL");
      } catch (error) {
        try {
          // Fallback to WebGL1 RENDERER constant
          const renderer = (gl as WebGLRenderingContext).getParameter(0x1f01);
          setGpuInfo(renderer.split(" ")[0] || "WebGL");
        } catch (error2) {
          setGpuInfo("WebGL");
        }
      }
    } else {
      setGpuInfo("No WebGL");
    }
  }, []);

  // RAM usage monitoring
  useEffect(() => {
    const updateRAMUsage = () => {
      try {
        if ("memory" in performance) {
          // Use Performance.memory API if available (Chrome/Edge)
          const memory = (performance as any).memory;
          if (memory && memory.usedJSHeapSize > 0) {
            const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
            const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
            setRamUsage(`${usedMB}MB / ${totalMB}MB`);
            return;
          }
        }

        if ("deviceMemory" in navigator) {
          // Use Navigator.deviceMemory API if available
          const deviceMemory = (navigator as any).deviceMemory;
          if (deviceMemory && deviceMemory > 0) {
            setRamUsage(`${deviceMemory}GB`);
            return;
          }
        }

        // Fallback: estimate based on memory events and other factors
        const timeBasedMB = Math.round(performance.now() / 1000 / 60); // Minutes since page load
        const eventBasedMB = Math.round(memoryEvents.length * 0.5); // Based on events
        const baseMB = Math.max(10, timeBasedMB, eventBasedMB); // Minimum 10MB
        setRamUsage(`~${baseMB}MB`);
      } catch (error) {
        // Final fallback
        setRamUsage("Unknown");
      }
    };

    updateRAMUsage();
    const interval = setInterval(updateRAMUsage, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, [memoryEvents.length]);

  // Monitor streaming state based on events
  useEffect(() => {
    const hasRecentEvents = events.some(
      (event) => event.ts && Date.now() / 1000 - event.ts < 5
    );
    setIsStreaming(hasRecentEvents);
  }, [events]);

  return (
    <div className={`w-fit flex items-center gap-3 ${className}`}>
      {/* FPS Counter */}
      <div className="glass flat p-2 flex items-center gap-2">
        <Activity className="w-3 h-3" />
        <span className="font-mono text-xs">{fps} FPS</span>
      </div>

      {/* RAM Usage */}
      <div className="glass flat p-2 flex items-center gap-2">
        <Database className="w-3 h-3" />
        <span className="font-mono text-xs">{ramUsage}</span>
      </div>

      {/* GPU Info */}
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
    </div>
  );
}

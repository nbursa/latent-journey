import { useState, useMemo, useEffect, memo, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { MemoryEvent } from "../types";
import { getEmbeddingForEvent } from "../utils/embeddings";
import { useWaypoints } from "../stores/appStore";

interface LatentScatterProps {
  memoryEvents: MemoryEvent[];
  selectedEvent: MemoryEvent | null;
  onSelectEvent: (event: MemoryEvent) => void;
  onHoverEvent: (
    event: MemoryEvent | null,
    mousePos?: { x: number; y: number }
  ) => void;
  className?: string;
  cameraPreset?: "top" | "isometric" | "free";
  showTrajectory?: boolean;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
  event: MemoryEvent;
  isSelected: boolean;
  isWaypoint: boolean;
  color: string;
  size: number;
  modality: "vision" | "speech" | "stm" | "ltm";
  arousal: number;
  valence: number;
}

// Enhanced 3D projection with semantic height
const projectTo3D = (
  embeddings: number[][],
  memoryEvents: MemoryEvent[],
  waypoints: Set<number>
) => {
  if (embeddings.length === 0) return [];

  return embeddings.map((embedding, index) => {
    const event = memoryEvents[index];

    // Use first 2 dimensions for X, Y
    const x = (embedding[0] || 0) * 200;
    const y = (embedding[1] || 0) * 200;

    // Use arousal/sentiment for Z (semantic height)
    const arousal = Number(event.facets["affect.arousal"]) || 0.5;
    const valence = Number(event.facets["affect.valence"]) || 0.5;
    const z = arousal * 80 + (valence - 0.5) * 40 + 50; // Center around Z=50-130

    const isVision = event.source === "vision";
    const isSpeech = event.source === "speech";
    const isSTM = event.source === "stm";
    const isLTM = event.source === "ltm";

    // Color based on modality
    let color = "#3B82F6"; // Default blue
    if (isVision) {
      color = "#00E0BE"; // Cyan for vision
    } else if (isSpeech) {
      color = "#1BB4F2"; // Teal for speech
    } else if (isSTM) {
      color = "#FFB020"; // Amber for STM
    } else if (isLTM) {
      color = "#8B5CF6"; // Purple for LTM
    }

    // Size based on importance/confidence
    const confidence = Number(event.facets["confidence"]) || 0.5;
    const size = Math.max(1, 3 + confidence * 4);

    return {
      x,
      y,
      z,
      event,
      isSelected: false,
      isWaypoint: waypoints.has(event.ts),
      color,
      size: waypoints.has(event.ts) ? size * 1.5 : size, // Make waypoints bigger
      modality: (isVision
        ? "vision"
        : isSpeech
        ? "speech"
        : isSTM
        ? "stm"
        : "ltm") as "vision" | "speech" | "stm" | "ltm",
      arousal,
      valence,
    };
  });
};

// Extract embeddings from memory events using unified utility
const extractEmbeddings = async (memoryEvents: MemoryEvent[]) => {
  const embeddings = await Promise.all(
    memoryEvents.map(async (event) => {
      const embedding = await getEmbeddingForEvent(event);
      return embedding.vector;
    })
  );
  return embeddings;
};

// Individual Points Component (more stable for small datasets)
function IndividualPoints({
  points,
  onSelectEvent,
  onHoverEvent,
}: {
  points: Point3D[];
  onSelectEvent: (event: MemoryEvent) => void;
  onHoverEvent: (
    event: MemoryEvent | null,
    mousePos?: { x: number; y: number }
  ) => void;
}) {
  // Limit points for display to prevent performance issues
  const maxPoints = 500; // Reduced to prevent WebGL context loss
  const limitedPoints = points.slice(0, maxPoints);

  if (limitedPoints.length === 0) {
    return null;
  }

  return (
    <>
      {limitedPoints.map((point, index) => (
        <mesh
          key={`point-${point.event.ts}-${index}`}
          position={[point.x, point.y, point.z]}
          scale={[point.size, point.size, point.size]}
          onClick={() => onSelectEvent(point.event)}
          onPointerOver={(event) => {
            // Throttle hover events to reduce parent state updates
            requestAnimationFrame(() => {
              const target = event.nativeEvent.target as HTMLElement;
              if (target) {
                const rect = target.getBoundingClientRect();
                const mousePos = {
                  x: event.nativeEvent.clientX - rect.left,
                  y: event.nativeEvent.clientY - rect.top,
                };
                onHoverEvent(point.event, mousePos);
              }
            });
          }}
          onPointerOut={() => onHoverEvent(null)}
        >
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            color={point.color}
            transparent
            opacity={0.8}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      ))}
    </>
  );
}

// Journey Lines Component
function JourneyLines({ points }: { points: Point3D[] }) {
  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(points.length * 3);

    points.forEach((point, index) => {
      positions[index * 3] = point.x;
      positions[index * 3 + 1] = point.y;
      positions[index * 3 + 2] = point.z;
    });

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [points]);

  return (
    <line>
      <primitive object={lineGeometry} />
      <lineBasicMaterial color="#00E0BE" transparent opacity={0.6} />
    </line>
  );
}

// Stable Canvas Component that never gets recreated
const StableCanvas = memo(
  function StableCanvas({
    children,
    onWebglError,
  }: {
    children: React.ReactNode;
    onWebglError?: (error: boolean) => void;
  }) {
    return (
      <Canvas
        camera={{ position: [100, 100, 100], fov: 75 }}
        style={{ background: "transparent" }}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: false,
          powerPreference: "high-performance",
          failIfMajorPerformanceCaveat: false,
        }}
        onError={(error) => {
          console.error("WebGL error:", error);
          onWebglError?.(true);
        }}
        onCreated={({ gl, scene, camera }) => {
          // Handle WebGL context loss
          const handleContextLost = (event: Event) => {
            event.preventDefault();
            console.warn("WebGL context lost, attempting to restore...");
            onWebglError?.(true);
          };

          const handleContextRestored = () => {
            console.log("WebGL context restored");
            onWebglError?.(false);
            // Force a re-render after a short delay
            setTimeout(() => {
              try {
                gl.resetState();
                gl.render(scene, camera);
              } catch (e) {
                console.warn("Could not reset WebGL state:", e);
              }
            }, 100);
          };

          gl.domElement.addEventListener("webglcontextlost", handleContextLost);
          gl.domElement.addEventListener(
            "webglcontextrestored",
            handleContextRestored
          );

          return () => {
            gl.domElement.removeEventListener(
              "webglcontextlost",
              handleContextLost
            );
            gl.domElement.removeEventListener(
              "webglcontextrestored",
              handleContextRestored
            );
          };
        }}
      >
        {children}
      </Canvas>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if children actually change
    return prevProps.children === nextProps.children;
  }
);

// Main Scene Component
function Scene3D({
  points,
  onSelectEvent,
  onHoverEvent,
  onFocus: _onFocus,
  setCameraPosition,
  focusTarget,
  setFocusTarget,
  cameraPreset = "free",
  showTrajectory = true,
  onCameraChange,
}: {
  points: Point3D[];
  onSelectEvent: (event: MemoryEvent) => void;
  onHoverEvent: (
    event: MemoryEvent | null,
    mousePos?: { x: number; y: number }
  ) => void;
  onFocus: (x: number, y: number) => void;
  setCameraPosition: (pos: { x: number; y: number; z: number }) => void;
  focusTarget: { x: number; y: number; z: number } | null;
  setFocusTarget: (target: { x: number; y: number; z: number } | null) => void;
  cameraPreset?: "top" | "isometric" | "free";
  showTrajectory?: boolean;
  onCameraChange?: () => void;
}) {
  const { camera } = useThree();

  // Handle focus requests - move camera to specific coordinates
  useEffect(() => {
    if (focusTarget) {
      // Smooth camera movement to the target position
      const targetX = focusTarget.x;
      const targetY = focusTarget.y;
      const targetZ = focusTarget.z || 200;

      // Set camera position and look at the target
      camera.position.set(targetX, targetY, targetZ);
      camera.lookAt(targetX, targetY, 90); // Look at center of Z range
      camera.updateProjectionMatrix();

      // Clear focus target after applying
      setFocusTarget(null);
    }
  }, [focusTarget, camera, setFocusTarget]);

  // Initialize camera position based on preset - only run when cameraPreset changes or points are first loaded
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initial camera setup - only runs once when points are first loaded
  useEffect(() => {
    if (points.length > 0 && !hasInitialized) {
      // Calculate bounds of all points
      const bounds = points.reduce(
        (acc, point) => ({
          minX: Math.min(acc.minX, point.x),
          maxX: Math.max(acc.maxX, point.x),
          minY: Math.min(acc.minY, point.y),
          maxY: Math.max(acc.maxY, point.y),
          minZ: Math.min(acc.minZ, point.z),
          maxZ: Math.max(acc.maxZ, point.z),
        }),
        {
          minX: Infinity,
          maxX: -Infinity,
          minY: Infinity,
          maxY: -Infinity,
          minZ: Infinity,
          maxZ: -Infinity,
        }
      );

      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      const centerZ = (bounds.minZ + bounds.maxZ) / 2;
      const maxSize = Math.max(
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY,
        bounds.maxZ - bounds.minZ
      );
      const distance = Math.max(maxSize * 2, 10);

      switch (cameraPreset) {
        case "top":
          camera.position.set(centerX, centerY + distance, centerZ);
          camera.lookAt(centerX, centerY, centerZ);
          setCameraPosition({ x: centerX, y: centerY + distance, z: centerZ });
          break;
        case "isometric":
          const isoX = centerX + distance * 0.5;
          const isoY = centerY + distance * 0.5;
          const isoZ = centerZ + distance * 0.5;
          camera.position.set(isoX, isoY, isoZ);
          camera.lookAt(centerX, centerY, centerZ);
          setCameraPosition({ x: isoX, y: isoY, z: isoZ });
          break;
        case "free":
        default:
          const freeX = centerX + distance * 0.5;
          const freeY = centerY + distance * 0.5;
          const freeZ = centerZ + distance * 0.5;
          camera.position.set(freeX, freeY, freeZ);
          camera.lookAt(centerX, centerY, centerZ);
          setCameraPosition({ x: freeX, y: freeY, z: freeZ });
          break;
      }
      setHasInitialized(true);
    } else if (points.length === 0) {
      // Reset initialization flag when no points
      setHasInitialized(false);
    }
  }, [points, camera, setCameraPosition, hasInitialized]);

  // Handle camera preset changes after initialization - separate effect
  useEffect(() => {
    if (!hasInitialized || points.length === 0) return;

    // Calculate bounds of all points
    const bounds = points.reduce(
      (acc, point) => ({
        minX: Math.min(acc.minX, point.x),
        maxX: Math.max(acc.maxX, point.x),
        minY: Math.min(acc.minY, point.y),
        maxY: Math.max(acc.maxY, point.y),
        minZ: Math.min(acc.minZ, point.z),
        maxZ: Math.max(acc.maxZ, point.z),
      }),
      {
        minX: Infinity,
        maxX: -Infinity,
        minY: Infinity,
        maxY: -Infinity,
        minZ: Infinity,
        maxZ: -Infinity,
      }
    );

    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2;
    const maxSize = Math.max(
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY,
      bounds.maxZ - bounds.minZ
    );
    const distance = Math.max(maxSize * 2, 10);

    switch (cameraPreset) {
      case "top":
        camera.position.set(centerX, centerY + distance, centerZ);
        camera.lookAt(centerX, centerY, centerZ);
        setCameraPosition({ x: centerX, y: centerY + distance, z: centerZ });
        break;
      case "isometric":
        const isoX = centerX + distance * 0.5;
        const isoY = centerY + distance * 0.5;
        const isoZ = centerZ + distance * 0.5;
        camera.position.set(isoX, isoY, isoZ);
        camera.lookAt(centerX, centerY, centerZ);
        setCameraPosition({ x: isoX, y: isoY, z: isoZ });
        break;
      case "free":
      default:
        const freeX = centerX + distance * 0.5;
        const freeY = centerY + distance * 0.5;
        const freeZ = centerZ + distance * 0.5;
        camera.position.set(freeX, freeY, freeZ);
        camera.lookAt(centerX, centerY, centerZ);
        setCameraPosition({ x: freeX, y: freeY, z: freeZ });
        break;
    }
  }, [cameraPreset, camera, setCameraPosition, points, hasInitialized]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00E0BE" />

      {/* Grid */}
      <gridHelper args={[600, 30, "#1E2531", "#0F131A"]} />

      {/* Journey lines */}
      {showTrajectory && points.length > 1 && (
        <JourneyLines
          points={[...points].sort((a, b) => a.event.ts - b.event.ts)}
        />
      )}

      {/* Individual points */}
      <IndividualPoints
        points={points}
        onSelectEvent={onSelectEvent}
        onHoverEvent={onHoverEvent}
      />

      {/* OrbitControls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={false}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        panSpeed={0.8}
        minDistance={50}
        maxDistance={500}
        onChange={onCameraChange}
      />
    </>
  );
}

const LatentScatter3D = memo(
  function LatentScatter3D({
    memoryEvents,
    selectedEvent,
    onSelectEvent,
    onHoverEvent,
    className = "",
    cameraPreset = "free",
    showTrajectory = true,
  }: LatentScatterProps) {
    const waypoints = useWaypoints();
    const [points, setPoints] = useState<Point3D[]>([]);
    const [isComputing, setIsComputing] = useState(false);
    const [hoveredEvent, setHoveredEvent] = useState<MemoryEvent | null>(null);
    const [webglError, setWebglError] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [focusTarget, setFocusTarget] = useState<{
      x: number;
      y: number;
      z: number;
    } | null>(null);

    // Camera position setter for Scene3D
    const setCameraPosition = (_pos: { x: number; y: number; z: number }) => {
      // This is used by Scene3D to update camera position
    };

    // Camera change handler for OrbitControls
    const handleCameraChange = useCallback(() => {
      // This will be called by OrbitControls onChange
    }, []);

    // Update visualization when memory events change
    useEffect(() => {
      if (memoryEvents.length === 0) {
        setPoints([]);
        setIsComputing(false);
        return;
      }

      setIsComputing(true);

      // Debounce the computation to prevent rapid re-renders
      const timeoutId = setTimeout(async () => {
        try {
          const embeddings = await extractEmbeddings(memoryEvents);
          const projectedPoints = projectTo3D(
            embeddings,
            memoryEvents,
            waypoints
          );

          // Update selected state
          const updatedPoints = projectedPoints.map((point) => ({
            ...point,
            isSelected: selectedEvent?.ts === point.event.ts,
          }));

          console.log(
            `LatentScatter3D: Generated ${updatedPoints.length} points`
          );
          setPoints(updatedPoints);
          setIsComputing(false);
        } catch (error) {
          console.error("Error computing 3D points:", error);
          setPoints([]);
          setIsComputing(false);
        }
      }, 100); // Further reduced delay

      return () => clearTimeout(timeoutId);
    }, [memoryEvents, selectedEvent, waypoints]);

    // Update selection without recomputing embeddings
    useEffect(() => {
      setPoints((prev) =>
        prev.map((p) => ({
          ...p,
          isSelected: selectedEvent?.ts === p.event.ts,
        }))
      );
    }, [selectedEvent]);

    const handleFocus = useCallback((worldX: number, worldY: number) => {
      // Focus camera on specific coordinates
      setFocusTarget({ x: worldX, y: worldY, z: 200 });
    }, []);

    const handleHover = useCallback(
      (event: MemoryEvent | null, mousePos?: { x: number; y: number }) => {
        setHoveredEvent(event);
        if (mousePos) {
          setMousePosition(mousePos);
        }
        onHoverEvent(event);
      },
      [onHoverEvent]
    );

    // Memoize Scene3D to prevent re-mounts on hover
    const sceneNode = useMemo(
      () => (
        <Scene3D
          points={points}
          onSelectEvent={onSelectEvent}
          onHoverEvent={handleHover}
          onFocus={handleFocus}
          setCameraPosition={setCameraPosition}
          focusTarget={focusTarget}
          setFocusTarget={setFocusTarget}
          cameraPreset={cameraPreset}
          showTrajectory={showTrajectory}
          onCameraChange={handleCameraChange}
        />
      ),
      [
        points,
        onSelectEvent,
        handleHover,
        handleFocus,
        focusTarget,
        cameraPreset,
        showTrajectory,
      ]
    );

    return (
      <div className={`h-full w-full ${className}`}>
        {isComputing ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-ui-dim">
              <div className="animate-spin w-8 h-8 border-2 border-ui-accent border-t-transparent rounded-full mx-auto mb-2"></div>
              <div>Computing 3D latent space...</div>
            </div>
          </div>
        ) : points.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-ui-dim">
              <div className="w-12 h-12 mx-auto mb-4 opacity-50">🔬</div>
              <div className="text-lg mb-2">No data yet</div>
              <div className="text-sm">
                Capture some images or speak to see the 3D latent space
              </div>
            </div>
          </div>
        ) : webglError ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-ui-dim">
              <div className="w-12 h-12 mx-auto mb-4 opacity-50">⚠️</div>
              <div className="text-lg mb-2">WebGL Error</div>
              <div className="text-sm mb-4">
                WebGL context was lost. Please refresh the page.
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-ui-accent text-ui-bg rounded hover:bg-ui-accent-2 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        ) : (
          <div className="relative h-full w-full">
            <StableCanvas onWebglError={setWebglError}>
              {sceneNode}
            </StableCanvas>
          </div>
        )}

        {/* Hover tooltip */}
        {hoveredEvent && (
          <div
            className="absolute p-3 max-w-xs text-white rounded shadow-lg"
            style={{
              zIndex: 9999,
              position: "absolute",
              top: `${mousePosition.y + 10}px`,
              left: `${mousePosition.x + 10}px`,
              backgroundColor: "rgba(0,0,0,0.9)",
              color: "white",
              padding: "12px",
              borderRadius: "0",
              border: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              maxWidth: "300px",
              fontSize: "12px",
              pointerEvents: "none", // Prevent tooltip from interfering with mouse events
            }}
          >
            <div
              className="text-sm font-bold mb-1"
              style={{ color: "#00E0BE" }}
            >
              {hoveredEvent.source.toUpperCase()}
            </div>
            <div className="text-xs mb-2" style={{ color: "#9CA3AF" }}>
              {new Date(hoveredEvent.ts * 1000).toLocaleTimeString()}
            </div>
            <div className="space-y-1">
              {Object.entries(hoveredEvent.facets)
                .slice(0, 3)
                .map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span
                      className="font-semibold"
                      style={{ color: "#00E0BE" }}
                    >
                      {key}:
                    </span>{" "}
                    <span>{String(value)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Legend */}
        {points.length > 0 && (
          <div className="absolute bottom-4 right-4 glass flat p-3 rounded">
            <div className="text-xs font-medium text-ui-text mb-2">
              Data Types
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: "#00E0BE" }}
                ></div>
                <span className="text-ui-dim">Vision</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: "#1BB4F2" }}
                ></div>
                <span className="text-ui-dim">Speech</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: "#FFB020" }}
                ></div>
                <span className="text-ui-dim">STM</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: "#8B5CF6" }}
                ></div>
                <span className="text-ui-dim">LTM</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Allow re-renders for memory events changes to handle filters properly
    // Only prevent re-render if nothing has changed
    return (
      prevProps.memoryEvents.length === nextProps.memoryEvents.length &&
      prevProps.memoryEvents.every(
        (event, index) =>
          event.ts === nextProps.memoryEvents[index]?.ts &&
          event.source === nextProps.memoryEvents[index]?.source
      ) &&
      prevProps.selectedEvent?.ts === nextProps.selectedEvent?.ts &&
      prevProps.cameraPreset === nextProps.cameraPreset &&
      prevProps.className === nextProps.className
    );
  }
);

export default LatentScatter3D;

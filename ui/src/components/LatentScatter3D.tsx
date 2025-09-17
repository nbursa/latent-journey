import { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { MemoryEvent } from "../types";

interface LatentScatterProps {
  memoryEvents: MemoryEvent[];
  selectedEvent: MemoryEvent | null;
  onSelectEvent: (event: MemoryEvent) => void;
  onHoverEvent: (event: MemoryEvent | null) => void;
  className?: string;
  cameraPreset?: "top" | "isometric" | "free";
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
const projectTo3D = (embeddings: number[][], memoryEvents: MemoryEvent[]) => {
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
      isWaypoint: false,
      color,
      size,
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

// Extract embeddings from memory events
const extractEmbeddings = (memoryEvents: MemoryEvent[]) => {
  return memoryEvents.map((event) => {
    const facets = event.facets;
    const embedding = new Array(128).fill(0);

    // Vision object features (dimensions 0-19)
    if (facets["vision.object"]) {
      const object = String(facets["vision.object"]).toLowerCase();
      const objectHash = object.split("").reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);
      for (let i = 0; i < 20; i++) {
        embedding[i] = Math.sin(objectHash + i) * 0.5 + 0.5;
      }
    }

    // Vision color features (dimensions 20-29)
    if (facets["vision.color"]) {
      const color = String(facets["vision.color"]).toLowerCase();
      const colorHash = color.split("").reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);
      for (let i = 20; i < 30; i++) {
        embedding[i] = Math.cos(colorHash + i) * 0.5 + 0.5;
      }
    }

    // Speech intent features (dimensions 30-49)
    if (facets["speech.intent"]) {
      const intent = String(facets["speech.intent"]).toLowerCase();
      const intentHash = intent.split("").reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);
      for (let i = 30; i < 50; i++) {
        embedding[i] = Math.sin(intentHash + i) * 0.5 + 0.5;
      }
    }

    // Affect features (dimensions 50-69)
    if (facets["affect.valence"]) {
      const valence = Number(facets["affect.valence"]);
      for (let i = 50; i < 60; i++) {
        embedding[i] = valence * (0.8 + 0.4 * Math.sin(i));
      }
    }

    if (facets["affect.arousal"]) {
      const arousal = Number(facets["affect.arousal"]);
      for (let i = 60; i < 70; i++) {
        embedding[i] = arousal * (0.8 + 0.4 * Math.cos(i));
      }
    }

    // Source type features (dimensions 70-79)
    const sourceHash = event.source.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    for (let i = 70; i < 80; i++) {
      embedding[i] = Math.sin(sourceHash + i) * 0.5 + 0.5;
    }

    // STM/LTM specific features (dimensions 80-89)
    if (event.source === "stm" || event.source === "ltm") {
      const content = event.content || "";
      const contentHash = content.split("").reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0);
      for (let i = 80; i < 90; i++) {
        embedding[i] = Math.cos(contentHash + i) * 0.5 + 0.5;
      }
    }

    // Temporal features (dimensions 90-99)
    const timeHash = event.ts
      .toString()
      .split("")
      .reduce((a, b) => {
        a = (a << 5) - a + parseInt(b);
        return a & a;
      }, 0);
    for (let i = 90; i < 100; i++) {
      embedding[i] = Math.cos(timeHash + i) * 0.5 + 0.5;
    }

    for (let i = 100; i < 128; i++) {
      embedding[i] = Math.random() * 0.1 - 0.05;
    }

    return embedding;
  });
};

// Instanced Points Component
function InstancedPoints({
  points,
  onSelectEvent,
  onHoverEvent,
}: {
  points: Point3D[];
  selectedEvent: MemoryEvent | null;
  onSelectEvent: (event: MemoryEvent) => void;
  onHoverEvent: (
    event: MemoryEvent | null,
    mousePos?: { x: number; y: number }
  ) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [, setHoveredId] = useState<number | null>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Update instance matrices
  useEffect(() => {
    if (!meshRef.current || points.length === 0) return;

    points.forEach((point, i) => {
      dummy.position.set(point.x, point.y, point.z);
      dummy.scale.setScalar(point.size);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [points, dummy]);

  // Handle clicks
  const handleClick = (event: any) => {
    if (event.intersections && event.intersections.length > 0) {
      const instanceId = event.intersections[0].instanceId;
      if (instanceId !== undefined && points[instanceId]) {
        onSelectEvent(points[instanceId].event);
      }
    }
  };

  // Handle hover
  const handlePointerOver = (event: any) => {
    if (event.intersections && event.intersections.length > 0) {
      const instanceId = event.intersections[0].instanceId;
      if (instanceId !== undefined && points[instanceId]) {
        setHoveredId(instanceId);
        // Get mouse position relative to the container
        const rect = event.nativeEvent.target.getBoundingClientRect();
        const mousePos = {
          x: event.nativeEvent.clientX - rect.left,
          y: event.nativeEvent.clientY - rect.top,
        };
        onHoverEvent(points[instanceId].event, mousePos);
      }
    }
  };

  const handlePointerOut = () => {
    setHoveredId(null);
    onHoverEvent(null);
  };

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, points.length]}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        color="#00E0BE"
        transparent
        opacity={0.8}
        roughness={0.2}
        metalness={0.8}
      />
    </instancedMesh>
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

// Main Scene Component
function Scene3D({
  points,
  selectedEvent,
  onSelectEvent,
  onHoverEvent,
  onFocus: _onFocus,
  setCameraPosition,
  focusTarget,
  setFocusTarget,
  cameraPreset = "free",
}: {
  points: Point3D[];
  selectedEvent: MemoryEvent | null;
  onSelectEvent: (event: MemoryEvent) => void;
  onHoverEvent: (event: MemoryEvent | null) => void;
  onFocus: (x: number, y: number) => void;
  setCameraPosition: (pos: { x: number; y: number; z: number }) => void;
  focusTarget: { x: number; y: number; z: number } | null;
  setFocusTarget: (target: { x: number; y: number; z: number } | null) => void;
  cameraPreset?: "top" | "isometric" | "free";
}) {
  const { camera } = useThree();

  // Track camera position changes
  useEffect(() => {
    const updatePosition = () => {
      setCameraPosition({
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      });
    };

    // Update position periodically
    const interval = setInterval(updatePosition, 100);
    return () => clearInterval(interval);
  }, [camera, setCameraPosition]);

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

  // Initialize camera position based on preset
  useEffect(() => {
    if (points.length > 0) {
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
    } else {
      // Default position when no points
      camera.position.set(150, 150, 150);
      camera.lookAt(0, 0, 0);
      setCameraPosition({ x: 150, y: 150, z: 150 });
    }
  }, [camera, setCameraPosition, points, cameraPreset]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00E0BE" />

      {/* Grid */}
      <gridHelper args={[600, 30, "#1E2531", "#0F131A"]} />

      {/* Journey lines */}
      {points.length > 1 && <JourneyLines points={points} />}

      {/* Instanced points */}
      <InstancedPoints
        points={points}
        selectedEvent={selectedEvent}
        onSelectEvent={onSelectEvent}
        onHoverEvent={onHoverEvent}
      />
    </>
  );
}

export default function LatentScatter({
  memoryEvents,
  selectedEvent,
  onSelectEvent,
  onHoverEvent,
  className = "",
  cameraPreset = "free",
}: LatentScatterProps) {
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

  // Update visualization when memory events change
  useEffect(() => {
    if (memoryEvents.length === 0) {
      setPoints([]);
      return;
    }

    setIsComputing(true);

    // Simulate computation delay
    setTimeout(() => {
      const embeddings = extractEmbeddings(memoryEvents);
      const projectedPoints = projectTo3D(embeddings, memoryEvents);

      // Update selected state
      const updatedPoints = projectedPoints.map((point) => ({
        ...point,
        isSelected: selectedEvent?.ts === point.event.ts,
      }));

      setPoints(updatedPoints);
      setIsComputing(false);
    }, 500);
  }, [memoryEvents, selectedEvent]);

  const handleFocus = (worldX: number, worldY: number) => {
    // Focus camera on specific coordinates
    setFocusTarget({ x: worldX, y: worldY, z: 200 });
  };

  const handleHover = (
    event: MemoryEvent | null,
    mousePos?: { x: number; y: number }
  ) => {
    setHoveredEvent(event);
    if (mousePos) {
      setMousePosition(mousePos);
    }
    onHoverEvent(event);
  };

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
          <Canvas
            camera={{ position: [100, 100, 100], fov: 75 }}
            style={{ background: "transparent" }}
            onError={(error) => {
              console.error("WebGL error:", error);
              setWebglError(true);
            }}
            onCreated={({ gl }) => {
              // Handle WebGL context loss
              const handleContextLost = (event: Event) => {
                event.preventDefault();
                console.warn("WebGL context lost, attempting to restore...");
                setWebglError(true);
              };

              const handleContextRestored = () => {
                console.log("WebGL context restored");
                setWebglError(false);
                // Force re-render
                gl.resetState();
              };

              gl.domElement.addEventListener(
                "webglcontextlost",
                handleContextLost
              );
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
            <Scene3D
              points={points}
              selectedEvent={selectedEvent}
              onSelectEvent={onSelectEvent}
              onHoverEvent={handleHover}
              onFocus={handleFocus}
              setCameraPosition={setCameraPosition}
              focusTarget={focusTarget}
              setFocusTarget={setFocusTarget}
              cameraPreset={cameraPreset}
            />
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
            />
          </Canvas>
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
            borderRadius: "8px",
            border: "1px solid #00E0BE",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            maxWidth: "300px",
            fontSize: "12px",
            pointerEvents: "none", // Prevent tooltip from interfering with mouse events
          }}
        >
          <div className="text-sm font-bold mb-1" style={{ color: "#00E0BE" }}>
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
                  <span className="font-semibold" style={{ color: "#00E0BE" }}>
                    {key}:
                  </span>{" "}
                  <span>{String(value)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

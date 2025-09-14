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
  modality: "vision" | "speech" | "text";
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
    const isText = event.source === "text";

    // Color based on modality
    let color = "#3B82F6"; // Default blue
    if (isVision) {
      color = "#00E0BE"; // Cyan for vision
    } else if (isSpeech) {
      color = "#1BB4F2"; // Teal for speech
    } else if (isText) {
      color = "#FFB020"; // Amber for text
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
      modality: (isVision ? "vision" : isSpeech ? "speech" : "text") as
        | "vision"
        | "speech"
        | "text",
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

    // Temporal features (dimensions 80-89)
    const timeHash = event.ts
      .toString()
      .split("")
      .reduce((a, b) => {
        a = (a << 5) - a + parseInt(b);
        return a & a;
      }, 0);
    for (let i = 80; i < 90; i++) {
      embedding[i] = Math.cos(timeHash + i) * 0.5 + 0.5;
    }

    // Add some noise to make the embedding more realistic
    for (let i = 90; i < 128; i++) {
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
  onHoverEvent: (event: MemoryEvent | null) => void;
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
        onHoverEvent(points[instanceId].event);
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

// Enhanced Mini Map with interactive features
function MiniMap({
  points,
  onFocus,
  cameraPosition,
  selectedEvent,
  onSelectEvent,
}: {
  points: Point3D[];
  onFocus: (x: number, y: number) => void;
  cameraPosition: { x: number; y: number; z: number };
  selectedEvent: MemoryEvent | null;
  onSelectEvent: (event: MemoryEvent) => void;
}) {
  const [filter, setFilter] = useState<"all" | "vision" | "speech">("all");
  const [showTrajectory, setShowTrajectory] = useState(true);

  const filteredPoints = points.filter(
    (point) => filter === "all" || point.modality === filter
  );

  // Calculate bounds for better mapping
  const bounds = filteredPoints.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      maxX: Math.max(acc.maxX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxY: Math.max(acc.maxY, point.y),
    }),
    {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    }
  );

  // Add padding to bounds
  const padding = 50;
  const rangeX = Math.max(100, bounds.maxX - bounds.minX + padding * 2);
  const rangeY = Math.max(100, bounds.maxY - bounds.minY + padding * 2);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;

  const handleClick = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    // Convert to world coordinates using the calculated bounds
    const worldX = centerX + (x - 0.5) * rangeX;
    const worldY = centerY + (y - 0.5) * rangeY;

    onFocus(worldX, worldY);
  };

  const handlePointClick = (point: Point3D, event: React.MouseEvent) => {
    event.stopPropagation();
    onSelectEvent(point.event);
  };

  // Calculate camera viewport bounds for indicator
  const viewportSize = 30;
  const cameraX = ((cameraPosition.x - centerX + rangeX / 2) / rangeX) * 100;
  const cameraY = ((cameraPosition.y - centerY + rangeY / 2) / rangeY) * 100;

  return (
    <div className="absolute top-4 right-4 w-60 h-72 glass flat border border-ui-border overflow-visible z-10">
      {/* Header with controls */}
      <div className="p-2 text-xs text-ui-dim border-b border-ui-border flex items-center justify-between">
        <span>Mini Map</span>
        <div className="flex gap-1">
          <button
            onClick={() => setShowTrajectory(!showTrajectory)}
            className={`px-1 py-0.5 text-xs ${
              showTrajectory ? "btn-primary" : "btn-secondary"
            }`}
            title="Toggle trajectory"
          >
            Path
          </button>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="p-2 flex gap-1 flex-wrap">
        {["all", "vision", "speech"].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type as any)}
            className={`px-2 py-1 text-xs ${
              filter === type ? "btn-primary" : "btn-secondary"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Map area */}
      <div
        className="w-full h-40 relative cursor-crosshair"
        onClick={handleClick}
      >
        {/* Trajectory line */}
        {showTrajectory && filteredPoints.length > 1 && (
          <svg className="absolute inset-0 w-full h-full">
            <polyline
              points={filteredPoints
                .map(
                  (point) =>
                    `${Math.max(
                      0,
                      Math.min(
                        100,
                        ((point.x - centerX + rangeX / 2) / rangeX) * 100
                      )
                    )}%,${Math.max(
                      0,
                      Math.min(
                        100,
                        ((point.y - centerY + rangeY / 2) / rangeY) * 100
                      )
                    )}%`
                )
                .join(" ")}
              fill="none"
              stroke="var(--ui-accent)"
              strokeWidth="1"
              opacity="0.6"
            />
          </svg>
        )}

        {/* Points */}
        {filteredPoints.map((point, index) => (
          <div
            key={index}
            className={`absolute w-3 h-3 rounded-full transition-all duration-200 cursor-pointer ${
              selectedEvent?.ts === point.event.ts
                ? "ring-2 ring-ui-accent ring-offset-1 ring-offset-ui-bg scale-125"
                : "hover:scale-150"
            }`}
            style={{
              left: `${Math.max(
                0,
                Math.min(100, ((point.x - centerX + rangeX / 2) / rangeX) * 100)
              )}%`,
              top: `${Math.max(
                0,
                Math.min(100, ((point.y - centerY + rangeY / 2) / rangeY) * 100)
              )}%`,
              backgroundColor: point.color,
              transform: "translate(-50%, -50%)",
              zIndex: selectedEvent?.ts === point.event.ts ? 10 : 1,
            }}
            onClick={(e) => handlePointClick(point, e)}
            title={`${point.event.source} - ${new Date(
              point.event.ts * 1000
            ).toLocaleTimeString()}`}
          />
        ))}

        {/* Camera viewport indicator */}
        <div
          className="absolute border border-ui-accent border-dashed opacity-60 pointer-events-none"
          style={{
            left: `${Math.max(0, Math.min(100, cameraX - viewportSize / 2))}%`,
            top: `${Math.max(0, Math.min(100, cameraY - viewportSize / 2))}%`,
            width: `${viewportSize}%`,
            height: `${viewportSize}%`,
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Center crosshair */}
        <div className="absolute top-1/2 left-1/2 w-4 h-4 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-full h-px bg-ui-accent opacity-30"></div>
          <div className="w-px h-full bg-ui-accent opacity-30"></div>
        </div>
      </div>

      {/* Quick controls */}
      <div className="p-2 flex gap-1 flex-wrap">
        <button
          onClick={() => onFocus(0, 0)}
          className="px-2 py-1 text-xs btn-secondary"
          title="Center view"
        >
          Center
        </button>
        <button
          onClick={() => {
            // Calculate bounds of all points
            const bounds = filteredPoints.reduce(
              (acc, point) => ({
                minX: Math.min(acc.minX, point.x),
                maxX: Math.max(acc.maxX, point.x),
                minY: Math.min(acc.minY, point.y),
                maxY: Math.max(acc.maxY, point.y),
              }),
              {
                minX: Infinity,
                maxX: -Infinity,
                minY: Infinity,
                maxY: -Infinity,
              }
            );

            const centerX = (bounds.minX + bounds.maxX) / 2;
            const centerY = (bounds.minY + bounds.maxY) / 2;
            onFocus(centerX, centerY);
          }}
          className="px-2 py-1 text-xs btn-secondary"
          title="Fit all points"
        >
          Fit All
        </button>
      </div>
    </div>
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
}: {
  points: Point3D[];
  selectedEvent: MemoryEvent | null;
  onSelectEvent: (event: MemoryEvent) => void;
  onHoverEvent: (event: MemoryEvent | null) => void;
  onFocus: (x: number, y: number) => void;
  setCameraPosition: (pos: { x: number; y: number; z: number }) => void;
  focusTarget: { x: number; y: number; z: number } | null;
  setFocusTarget: (target: { x: number; y: number; z: number } | null) => void;
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

  // Initialize camera position
  useEffect(() => {
    camera.position.set(300, 300, 300);
    camera.lookAt(0, 0, 90);
    setCameraPosition({ x: 300, y: 300, z: 300 });
  }, [camera, setCameraPosition]);

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
}: LatentScatterProps) {
  const [points, setPoints] = useState<Point3D[]>([]);
  const [isComputing, setIsComputing] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState<MemoryEvent | null>(null);
  const [webglError, setWebglError] = useState(false);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0, z: 0 });
  const [focusTarget, setFocusTarget] = useState<{
    x: number;
    y: number;
    z: number;
  } | null>(null);

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

  const handleHover = (event: MemoryEvent | null) => {
    setHoveredEvent(event);
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

          {/* Mini Map - Outside Canvas */}
          <MiniMap
            points={points}
            onFocus={handleFocus}
            cameraPosition={cameraPosition}
            selectedEvent={selectedEvent}
            onSelectEvent={onSelectEvent}
          />
        </div>
      )}

      {/* Hover tooltip */}
      {hoveredEvent && (
        <div className="absolute top-4 left-4 card p-3 max-w-xs">
          <div className="text-sm font-medium text-ui-accent mb-1">
            {hoveredEvent.source.toUpperCase()}
          </div>
          <div className="text-xs text-ui-dim mb-2">
            {new Date(hoveredEvent.ts * 1000).toLocaleTimeString()}
          </div>
          <div className="space-y-1">
            {Object.entries(hoveredEvent.facets)
              .slice(0, 3)
              .map(([key, value]) => (
                <div key={key} className="text-xs">
                  <span className="text-ui-dim">{key}:</span>{" "}
                  <span className="text-ui-text">{String(value)}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

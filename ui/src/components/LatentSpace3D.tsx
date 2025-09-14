import { MemoryEvent } from "../types";
import { useRef, useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useWaypoints, useWaypointActions } from "../stores/appStore";
import { Map, RotateCcw, Eye } from "lucide-react";

interface LatentSpace3DProps {
  memoryEvents: MemoryEvent[];
  selectedEvent: MemoryEvent | null;
  onSelectEvent: (event: MemoryEvent) => void;
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
}

// 3D Projection function - more sophisticated than 2D
const projectTo3D = (embeddings: number[][], memoryEvents: MemoryEvent[]) => {
  if (embeddings.length === 0) return [];

  // Use first 3 dimensions for 3D projection
  return embeddings.map((embedding, index) => {
    const x = (embedding[0] || 0) * 50 + (Math.random() - 0.5) * 10;
    const y = (embedding[1] || 0) * 50 + (Math.random() - 0.5) * 10;
    const z = (embedding[2] || 0) * 50 + (Math.random() - 0.5) * 10;

    const event = memoryEvents[index];
    const isVision = event.source === "vision";
    const isSpeech = event.source === "speech";

    // Color based on source and affect
    let color = "#3B82F6"; // Default blue
    if (isVision) {
      const valence = Number(event.facets["affect.valence"]) || 0.5;
      const arousal = Number(event.facets["affect.arousal"]) || 0.5;
      // Color based on valence (red-green) and brightness based on arousal
      const r = Math.floor(valence * 255);
      const g = Math.floor((1 - valence) * 255);
      const b = Math.floor(arousal * 255);
      color = `rgb(${r}, ${g}, ${b})`;
    } else if (isSpeech) {
      color = "#10B981"; // Green for speech
    }

    // Size based on recency and importance - much larger for better interaction
    const age = Date.now() / 1000 - event.ts;
    const size = Math.max(1.5, 4 - age / 3600); // Larger base size, smaller as it gets older

    return {
      x,
      y,
      z,
      event,
      isSelected: false,
      isWaypoint: false,
      color,
      size,
    };
  });
};

// Extract embeddings from memory events (same as 2D version)
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

// Tooltip component that renders outside Canvas
function Tooltip({
  event,
  visible,
  container,
}: {
  event: MemoryEvent | null;
  visible: boolean;
  container: HTMLElement | null;
}) {
  if (!visible || !event || !container) return null;

  return createPortal(
    <div className="absolute top-5 right-5 z-50 pointer-events-none select-none p-4 min-w-64 max-w-80 bg-[var(--bg-primary)] border border-[var(--border-color)] font-thin">
      <div className="text-lg text-blue-400 mb-1">
        {event.source.toUpperCase()}
      </div>
      <div className="text-xs text-gray-400 mb-3">
        {new Date(event.ts * 1000).toLocaleTimeString()}
      </div>

      {/* Vision facets */}
      {event.facets["vision.object"] && (
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-blue-300">Object:</span>{" "}
          {String(event.facets["vision.object"])
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")}
        </div>
      )}
      {event.facets["vision.color"] && (
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-blue-300">Color:</span>{" "}
          {String(event.facets["vision.color"])
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")}
        </div>
      )}

      {/* Speech facets */}
      {event.facets["speech.intent"] && (
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-green-300">Intent:</span>{" "}
          {String(event.facets["speech.intent"])
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")}
        </div>
      )}
      {event.facets["speech.transcript"] && (
        <div className="flex items-center justify-between mb-2 text-sm text-right">
          <span className="text-green-300">Transcript:</span>{" "}
          {String(event.facets["speech.transcript"])
            .split(" ")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")}
        </div>
      )}

      {/* Affect facets */}
      {event.facets["affect.valence"] && (
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-yellow-300">Valence:</span>{" "}
          {Number(event.facets["affect.valence"]).toFixed(2)}
        </div>
      )}
      {event.facets["affect.arousal"] && (
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-yellow-300">Arousal:</span>{" "}
          {Number(event.facets["affect.arousal"]).toFixed(2)}
        </div>
      )}

      {/* Additional facets */}
      {Object.entries(event.facets).map(([key, value]) => {
        if (
          key.startsWith("vision.") ||
          key.startsWith("speech.") ||
          key.startsWith("affect.")
        ) {
          return null; // Already handled above
        }
        return (
          <div
            key={key}
            className="flex items-center justify-between mb-2 text-sm"
          >
            <span className="text-gray-300">
              {key
                .split(".")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")}
              :
            </span>{" "}
            {String(value)
              .split(" ")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ")}
          </div>
        );
      })}
    </div>,
    container
  );
}

// Animated particle component
function Particle({
  point,
  isSelected,
  isWaypoint,
  onSelect,
  onHover,
}: {
  point: Point3D;
  isSelected: boolean;
  isWaypoint: boolean;
  onSelect: (event: MemoryEvent) => void;
  onHover: (event: MemoryEvent | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(() => {
    if (meshRef.current) {
      // Completely static particles - no movement, no pulsing, no rotation
      meshRef.current.position.y = point.y;
      meshRef.current.rotation.y = 0;
      meshRef.current.scale.setScalar(1);
    }
  });

  const handleClick = () => {
    onSelect(point.event);
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        position={[point.x, point.y, point.z]}
        onClick={handleClick}
        onPointerOver={() => {
          console.log("Hovering over visible particle:", point.event.ts);
          setHovered(true);
          onHover(point.event);
        }}
        onPointerOut={() => {
          console.log(
            "Stopped hovering over visible particle:",
            point.event.ts
          );
          setHovered(false);
          onHover(null);
        }}
      >
        <sphereGeometry args={[point.size, 32, 32]} />
        <meshStandardMaterial
          color={point.color}
          emissive={
            isSelected
              ? "#ff0000"
              : isWaypoint
              ? "#ffaa00"
              : hovered
              ? "#ffffff"
              : "#000000"
          }
          emissiveIntensity={
            isSelected ? 0.8 : isWaypoint ? 0.5 : hovered ? 0.3 : 0
          }
          transparent
          opacity={hovered ? 1.0 : 0.8}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Larger invisible sphere for easier clicking */}
      <mesh
        position={[point.x, point.y, point.z]}
        onClick={handleClick}
        onPointerOver={() => {
          console.log("Hovering over particle:", point.event.ts);
          setHovered(true);
          onHover(point.event);
        }}
        onPointerOut={() => {
          console.log("Stopped hovering over particle:", point.event.ts);
          setHovered(false);
          onHover(null);
        }}
      >
        <sphereGeometry args={[point.size * 1.5, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      {/* Glow effect for selected particles */}
      {isSelected && (
        <mesh position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[point.size * 2, 16, 16]} />
          <meshBasicMaterial
            color="#ff0000"
            transparent
            opacity={0.1}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  );
}

// Trajectory line component
function TrajectoryLine({ points }: { points: Point3D[] }) {
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
    <primitive
      object={
        new THREE.Line(
          lineGeometry,
          new THREE.LineBasicMaterial({
            color: "#3B82F6",
            transparent: true,
            opacity: 0.5,
          })
        )
      }
    />
  );
}

// Main 3D scene component
function Scene3D({
  points,
  selectedEvent,
  onSelectEvent,
  onHover,
  cameraPreset = "free",
}: {
  points: Point3D[];
  selectedEvent: MemoryEvent | null;
  onSelectEvent: (event: MemoryEvent) => void;
  onHover: (event: MemoryEvent | null) => void;
  cameraPreset?: "top" | "isometric" | "free";
}) {
  const { camera, gl } = useThree();
  const waypoints = useWaypoints();

  useEffect(() => {
    // Calculate bounds of all points to position camera appropriately
    if (points.length > 0) {
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

      // Calculate center and size of the point cloud
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      const centerZ = (bounds.minZ + bounds.maxZ) / 2;

      const sizeX = bounds.maxX - bounds.minX;
      const sizeY = bounds.maxY - bounds.minY;
      const sizeZ = bounds.maxZ - bounds.minZ;
      const maxSize = Math.max(sizeX, sizeY, sizeZ);

      // Position camera based on preset
      const distance = Math.max(maxSize * 0.8, 30); // Much closer, minimum 30 units away

      switch (cameraPreset) {
        case "top":
          // Top view - camera directly above
          camera.position.set(centerX, centerY + distance, centerZ);
          camera.lookAt(centerX, centerY, centerZ);
          break;
        case "isometric":
          // Isometric view - 45-degree angle
          const isoDistance = distance * 1.2;
          camera.position.set(
            centerX + isoDistance * 0.7,
            centerY + isoDistance * 0.7,
            centerZ + isoDistance * 0.7
          );
          camera.lookAt(centerX, centerY, centerZ);
          break;
        case "free":
        default:
          // Free view - current dynamic positioning
          const cameraX = centerX + distance * 0.65;
          const cameraY = centerY + distance * 0.65;
          const cameraZ = centerZ + distance * 0.65;
          camera.position.set(cameraX, cameraY, cameraZ);
          camera.lookAt(centerX, centerY, centerZ);
          break;
      }
    } else {
      // Default position when no points
      camera.position.set(150, 150, 150);
      camera.lookAt(0, 0, 0);
    }

    // Handle WebGL context loss
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn("WebGL context lost, attempting to restore...");
    };

    const handleContextRestored = () => {
      console.log("WebGL context restored");
      // Force re-render
      gl.resetState();
    };

    gl.domElement.addEventListener("webglcontextlost", handleContextLost);
    gl.domElement.addEventListener(
      "webglcontextrestored",
      handleContextRestored
    );

    return () => {
      gl.domElement.removeEventListener("webglcontextlost", handleContextLost);
      gl.domElement.removeEventListener(
        "webglcontextrestored",
        handleContextRestored
      );
    };
  }, [camera, gl, points, cameraPreset]);

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#3B82F6" />

      {/* Grid */}
      <gridHelper args={[200, 20, "#444444", "#222222"]} />

      {/* Axes */}
      <axesHelper args={[50]} />

      {/* Trajectory line */}
      {points.length > 1 && <TrajectoryLine points={points} />}

      {/* Particles */}
      {points.map((point, index) => (
        <Particle
          key={`${point.event.ts}-${point.event.source}-${index}`}
          point={point}
          isSelected={selectedEvent?.ts === point.event.ts}
          isWaypoint={waypoints.has(point.event.ts)}
          onSelect={onSelectEvent}
          onHover={onHover}
        />
      ))}
    </>
  );
}

export default function LatentSpace3D({
  memoryEvents,
  selectedEvent,
  onSelectEvent,
  cameraPreset = "free",
}: LatentSpace3DProps) {
  const [points, setPoints] = useState<Point3D[]>([]);
  const [isComputing, setIsComputing] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState<MemoryEvent | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const waypoints = useWaypoints();
  const { clearWaypoints } = useWaypointActions();

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

  return (
    <div className="h-full flex flex-col min-h-0 p-2">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Map className="w-5 h-5" />
          3D Latent Space
        </h2>
        <div className="flex gap-2">
          <button
            onClick={clearWaypoints}
            className="px-2 py-1 text-xs btn-secondary flex items-center gap-1"
            disabled={waypoints.size === 0}
          >
            <RotateCcw className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      <div className="relative flex-1 p-4 min-h-0 overflow-hidden">
        {isComputing ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <div>Computing 3D latent space...</div>
            </div>
          </div>
        ) : points.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <div className="text-lg mb-2">No data yet</div>
              <div className="text-sm">
                Capture some images or speak to see the 3D latent space
              </div>
            </div>
          </div>
        ) : webglError ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <div className="text-lg mb-2">WebGL Error</div>
              <div className="text-sm">
                WebGL context was lost. Please refresh the page.
              </div>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Refresh Page
              </button>
            </div>
          </div>
        ) : (
          <div ref={canvasContainerRef} className="h-full w-full min-h-0">
            <Canvas
              camera={{ position: [100, 100, 100], fov: 75 }}
              style={{ background: "transparent" }}
              onError={() => setWebglError(true)}
            >
              <Scene3D
                points={points}
                selectedEvent={selectedEvent}
                onSelectEvent={onSelectEvent}
                onHover={setHoveredEvent}
                cameraPreset={cameraPreset}
              />
              <OrbitControls
                enablePan={true}
                enableZoom={true}
                enableRotate={true}
                autoRotate={false}
                autoRotateSpeed={0.5}
                rotateSpeed={0.5}
                zoomSpeed={0.8}
                panSpeed={0.8}
                minDistance={10}
                maxDistance={500}
              />
            </Canvas>
          </div>
        )}
      </div>

      {points.length > 0 && (
        <div className="mt-4 text-xs text-gray-400 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span>Points: {points.length}</span>
            <span>Waypoints: {waypoints.size}</span>
            <span>
              Click points to select • Drag to rotate • Scroll to zoom
            </span>
          </div>
        </div>
      )}

      {/* Tooltip rendered outside Canvas */}
      <Tooltip
        event={hoveredEvent}
        visible={!!hoveredEvent}
        container={canvasContainerRef.current}
      />
    </div>
  );
}

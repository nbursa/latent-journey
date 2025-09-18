import React, {
  useState,
  useMemo,
  useEffect,
  memo,
  useCallback,
  useRef,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { MemoryEvent } from "../types";
import { getEmbeddingForEvent } from "../utils/embeddings";
import {
  useWaypoints,
  useWaypointA,
  useWaypointB,
  useWaypointActions,
} from "../stores/appStore";
import { Cluster, SemanticGroup } from "../utils/clustering";

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
  selectedCluster?: Cluster | null;
  selectedGroup?: SemanticGroup | null;
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
  isHighlighted: boolean;
  isWaypointA: boolean;
  isWaypointB: boolean;
  uniqueId: string;
}

// Enhanced 3D projection with semantic height
const projectTo3D = (
  embeddings: number[][],
  memoryEvents: MemoryEvent[],
  waypoints: Set<number>,
  selectedCluster?: Cluster | null,
  selectedGroup?: SemanticGroup | null,
  waypointA?: MemoryEvent | null,
  waypointB?: MemoryEvent | null
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

    // Check if this event should be highlighted based on cluster or group selection
    let isHighlighted = false;
    if (selectedCluster) {
      isHighlighted = selectedCluster.points.some((p) => p.ts === event.ts);
    } else if (selectedGroup) {
      isHighlighted = selectedGroup.events.some((e) => e.ts === event.ts);
    }

    // Create unique ID for this point using index (truly unique)
    const uniqueId = `point-${index}`;

    // Check if this event is waypoint A or B using object reference comparison
    const isWaypointA = !!(waypointA && waypointA === event);
    const isWaypointB = !!(waypointB && waypointB === event);
    const isWaypointAB = isWaypointA || isWaypointB;

    return {
      x,
      y,
      z,
      event,
      isSelected: false,
      isWaypoint: waypoints.has(event.ts),
      color: isWaypointAB ? "#FFFFFF" : color, // White for waypoint A/B
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
      isHighlighted,
      isWaypointA,
      isWaypointB,
      uniqueId,
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

// Individual Points Component (restored with proper performance)
function IndividualPoints({
  points,
  onHoverEvent,
  onWaypointClick,
}: {
  points: Point3D[];
  onHoverEvent: (
    event: MemoryEvent | null,
    mousePos?: { x: number; y: number }
  ) => void;
  onWaypointClick: (event: MemoryEvent) => void;
}) {
  // Limit points for display to prevent performance issues
  const maxPoints = 500;
  const limitedPoints = points.slice(0, maxPoints);

  if (limitedPoints.length === 0) {
    return null;
  }

  return (
    <>
      {limitedPoints.map((point, index) => (
        <group key={`point-${point.event.ts}-${index}`}>
          <mesh
            position={[point.x, point.y, point.z]}
            scale={[point.size, point.size, point.size]}
            onClick={() => onWaypointClick(point.event)}
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

          {/* A/B letter labels for waypoints */}
          {(point.isWaypointA || point.isWaypointB) && (
            <mesh position={[point.x, point.y + point.size * 2, point.z]}>
              <planeGeometry args={[4, 4]} />
              <meshBasicMaterial
                color="#000000"
                transparent
                opacity={0.9}
                map={(() => {
                  const canvas = document.createElement("canvas");
                  const context = canvas.getContext("2d");
                  if (context) {
                    canvas.width = 64;
                    canvas.height = 64;
                    context.fillStyle = "#000000";
                    context.fillRect(0, 0, 64, 64);
                    context.fillStyle = "#FFFFFF";
                    context.font = "bold 32px Arial";
                    context.textAlign = "center";
                    context.textBaseline = "middle";
                    context.fillText(point.isWaypointA ? "A" : "B", 32, 32);
                  }
                  return new THREE.CanvasTexture(canvas);
                })()}
              />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
}

// Journey Lines Component with proper disposal
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

  // Cleanup geometry on unmount
  useEffect(() => {
    return () => {
      lineGeometry.dispose();
    };
  }, [lineGeometry]);

  return (
    <line>
      <primitive object={lineGeometry} />
      <lineBasicMaterial color="#00E0BE" transparent opacity={0.6} />
    </line>
  );
}

// Stable Canvas Component that never gets recreated
const StableCanvas = memo(
  function StableCanvas({ children }: { children: React.ReactNode }) {
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
        }}
        onCreated={({ gl, scene, camera }) => {
          // Handle WebGL context loss - just log and try to continue
          const handleContextLost = (event: Event) => {
            event.preventDefault();
            console.warn("WebGL context lost, attempting to restore...");
          };

          const handleContextRestored = () => {
            console.log("WebGL context restored");
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

// Main Scene Component - Memoized to prevent unnecessary re-renders
const Scene3D = React.memo(
  function Scene3D({
    points,
    onHoverEvent,
    onWaypointClick,
    onFocus: _onFocus,
    setCameraPosition,
    focusTarget,
    setFocusTarget,
    cameraPreset = "free",
    showTrajectory = true,
    onCameraChange,
  }: {
    points: Point3D[];
    onHoverEvent: (
      event: MemoryEvent | null,
      mousePos?: { x: number; y: number }
    ) => void;
    onWaypointClick: (event: MemoryEvent) => void;
    onFocus: (x: number, y: number) => void;
    setCameraPosition: (pos: { x: number; y: number; z: number }) => void;
    focusTarget: { x: number; y: number; z: number } | null;
    setFocusTarget: (
      target: { x: number; y: number; z: number } | null
    ) => void;
    cameraPreset?: "top" | "isometric" | "free";
    showTrajectory?: boolean;
    onCameraChange?: () => void;
  }) {
    const { camera } = useThree();
    const controlsRef = useRef<any>(null);
    const [currentPoints, setCurrentPoints] = useState<Point3D[]>(points);
    const pointsRef = useRef<Point3D[]>(points);

    // Update points ref and state when points prop changes
    useEffect(() => {
      pointsRef.current = points;
      setCurrentPoints(points);
    }, [points]);

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
      if (currentPoints.length > 0 && !hasInitialized) {
        // Calculate bounds of all points
        const bounds = currentPoints.reduce(
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
            setCameraPosition({
              x: centerX,
              y: centerY + distance,
              z: centerZ,
            });
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
      } else if (currentPoints.length === 0) {
        // Reset initialization flag when no points
        setHasInitialized(false);
      }
    }, [currentPoints, camera, setCameraPosition, hasInitialized]);

    // Handle camera preset changes after initialization - separate effect
    useEffect(() => {
      if (!hasInitialized || currentPoints.length === 0) return;

      // Calculate bounds of all points
      const bounds = currentPoints.reduce(
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
    }, [
      cameraPreset,
      camera,
      setCameraPosition,
      currentPoints,
      hasInitialized,
    ]);

    // Auto-fit camera when points change significantly (e.g., after filtering)
    useEffect(() => {
      if (!hasInitialized || currentPoints.length === 0) return;

      // Only auto-fit if the point count changed significantly (e.g., after filtering)
      const shouldAutoFit = currentPoints.length > 0;

      if (shouldAutoFit) {
        // Calculate bounds and center
        const bounds = currentPoints.reduce(
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

        // Set the controls target to the center
        if (controlsRef.current) {
          controlsRef.current.target.set(centerX, centerY, centerZ);
          controlsRef.current.update();
        }

        // Smoothly animate to the new center
        camera.position.lerp(
          new THREE.Vector3(
            centerX + distance * 0.5,
            centerY + distance * 0.5,
            centerZ + distance * 0.5
          ),
          0.1
        );
        camera.lookAt(centerX, centerY, centerZ);
        camera.updateProjectionMatrix();
      }
    }, [currentPoints, camera, hasInitialized]);

    return (
      <>
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight
          position={[-10, -10, -10]}
          intensity={0.5}
          color="#00E0BE"
        />

        {/* Grid */}
        <gridHelper args={[600, 30, "#1E2531", "#0F131A"]} />

        {/* Journey lines */}
        {showTrajectory && currentPoints.length > 1 && (
          <JourneyLines
            points={[...currentPoints].sort((a, b) => a.event.ts - b.event.ts)}
          />
        )}

        {/* Individual points with proper colors and tooltips */}
        <IndividualPoints
          points={currentPoints}
          onHoverEvent={onHoverEvent}
          onWaypointClick={onWaypointClick}
        />

        {/* OrbitControls */}
        <OrbitControls
          ref={controlsRef}
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
  },
  (prevProps, nextProps) => {
    // Custom comparison - ignore points changes to prevent WebGL context loss
    return (
      prevProps.onHoverEvent === nextProps.onHoverEvent &&
      prevProps.onWaypointClick === nextProps.onWaypointClick &&
      prevProps.focusTarget === nextProps.focusTarget &&
      prevProps.cameraPreset === nextProps.cameraPreset &&
      prevProps.showTrajectory === nextProps.showTrajectory
      // Intentionally ignore points prop changes
    );
  }
);

const LatentScatter3D = memo(
  function LatentScatter3D({
    memoryEvents,
    selectedEvent,
    onSelectEvent,
    onHoverEvent,
    className = "",
    cameraPreset = "free",
    showTrajectory = true,
    selectedCluster = null,
    selectedGroup = null,
  }: LatentScatterProps) {
    const waypoints = useWaypoints();
    const waypointA = useWaypointA();
    const waypointB = useWaypointB();
    const { setWaypointA, setWaypointB } = useWaypointActions();
    const [points, setPoints] = useState<Point3D[]>([]);
    const [isComputing, setIsComputing] = useState(false);
    const [hoveredEvent, setHoveredEvent] = useState<MemoryEvent | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [focusTarget, setFocusTarget] = useState<{
      x: number;
      y: number;
      z: number;
    } | null>(null);

    // Camera position setter for Scene3D - memoized to prevent re-renders
    const setCameraPosition = useCallback(
      (_pos: { x: number; y: number; z: number }) => {
        // This is used by Scene3D to update camera position
      },
      []
    );

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
            waypoints,
            selectedCluster,
            selectedGroup,
            waypointA,
            waypointB
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
    }, [
      memoryEvents,
      selectedEvent,
      waypoints,
      selectedCluster,
      selectedGroup,
      waypointA,
      waypointB,
    ]);

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

    const handleWaypointClick = useCallback(
      (event: MemoryEvent) => {
        // Set as waypoint A or B using object reference comparison
        const isCurrentWaypointA = waypointA && waypointA === event;
        const isCurrentWaypointB = waypointB && waypointB === event;

        if (isCurrentWaypointA) {
          // If clicking on waypoint A, clear it
          setWaypointA(null);
        } else if (isCurrentWaypointB) {
          // If clicking on waypoint B, clear it
          setWaypointB(null);
        } else if (!waypointA) {
          // If no waypoint A, set as A
          setWaypointA(event);
        } else if (!waypointB) {
          // If no waypoint B, set as B
          setWaypointB(event);
        } else {
          // If both A and B are set, replace A
          setWaypointA(event);
        }

        // Also select the event for other UI updates
        onSelectEvent(event);
      },
      [waypointA, waypointB, setWaypointA, setWaypointB, onSelectEvent]
    );

    // Create a stable Scene3D component that doesn't remount
    const sceneNode = (
      <Scene3D
        points={points}
        onHoverEvent={handleHover}
        onWaypointClick={handleWaypointClick}
        onFocus={handleFocus}
        setCameraPosition={setCameraPosition}
        focusTarget={focusTarget}
        setFocusTarget={setFocusTarget}
        cameraPreset={cameraPreset}
        showTrajectory={showTrajectory}
        onCameraChange={handleCameraChange}
      />
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
        ) : (
          <div className="relative h-full w-full">
            <StableCanvas>{sceneNode}</StableCanvas>
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
      prevProps.className === nextProps.className &&
      prevProps.selectedCluster?.id === nextProps.selectedCluster?.id &&
      prevProps.selectedGroup?.id === nextProps.selectedGroup?.id
    );
  }
);

export default LatentScatter3D;

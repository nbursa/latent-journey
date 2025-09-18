import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";
import { MemoryEvent } from "../types";
import { generateEmbedding, reduceDimensions } from "../utils/embeddings";

interface Point3D {
  x: number;
  y: number;
  z: number;
  event: MemoryEvent;
  isSelected: boolean;
  isWaypoint: boolean;
  color: string;
  size: number;
  confidence: number;
  source: string;
}

interface RealLatentSpace3DProps {
  memoryEvents: MemoryEvent[];
  selectedEvent: MemoryEvent | null;
  onSelectEvent: (event: MemoryEvent) => void;
  onHover?: (event: MemoryEvent | null) => void;
  cameraPreset?: "top" | "isometric" | "free";
  selectedCluster?: any;
  selectedGroup?: any;
  showTrajectory?: boolean;
}

// Constants - single source of truth
const CAMERA_CONFIG = {
  distanceMultiplier: 2,
  minDistance: 10,
  defaultDistance: 100,
  fov: 75,
  near: 0.1,
  far: 10000,
} as const;

// Utility functions - pure and testable
const calculateBounds = (points: Point3D[]) => {
  if (points.length === 0) return null;

  return points.reduce(
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
};

const calculateCenter = (bounds: any) => ({
  x: (bounds.minX + bounds.maxX) / 2,
  y: (bounds.minY + bounds.maxY) / 2,
  z: (bounds.minZ + bounds.maxZ) / 2,
});

const calculateMaxSize = (bounds: any) => {
  return Math.max(
    bounds.maxX - bounds.minX,
    bounds.maxY - bounds.minY,
    bounds.maxZ - bounds.minZ
  );
};

const calculateCameraDistance = (points: Point3D[]) => {
  if (points.length === 0) return CAMERA_CONFIG.defaultDistance;

  const bounds = calculateBounds(points);
  if (!bounds) return CAMERA_CONFIG.defaultDistance;

  const maxSize = calculateMaxSize(bounds);
  return Math.max(
    maxSize * CAMERA_CONFIG.distanceMultiplier,
    CAMERA_CONFIG.minDistance
  );
};

const positionCamera = (
  camera: THREE.PerspectiveCamera,
  center: any,
  distance: number,
  preset: string
) => {
  switch (preset) {
    case "top":
      camera.position.set(center.x, center.y + distance, center.z);
      camera.lookAt(center.x, center.y, center.z);
      break;
    case "isometric":
      camera.position.set(
        center.x + distance * 0.5,
        center.y + distance * 0.5,
        center.z + distance * 0.5
      );
      camera.lookAt(center.x, center.y, center.z);
      break;
    case "free":
    default:
      camera.position.set(
        center.x + distance * 0.5,
        center.y + distance * 0.5,
        center.z + distance * 0.5
      );
      camera.lookAt(center.x, center.y, center.z);
      break;
  }
};

export default function RealLatentSpace3D({
  memoryEvents,
  selectedEvent,
  onSelectEvent,
  onHover,
  cameraPreset = "free",
  showTrajectory = true,
}: RealLatentSpace3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Simplified state - only what's necessary
  const [points, setPoints] = useState<Point3D[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<MemoryEvent | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Memoized calculations - only recalculate when points change
  const cameraData = useMemo(() => {
    if (points.length === 0) return null;

    const bounds = calculateBounds(points);
    if (!bounds) return null;

    return {
      bounds,
      center: calculateCenter(bounds),
      distance: calculateCameraDistance(points),
    };
  }, [points]);

  // Extract embeddings from memory events
  const extractEmbeddings = useCallback(async () => {
    if (memoryEvents.length === 0) return [];

    return memoryEvents.map((event) => {
      // Use existing embedding if available, otherwise generate one
      if (
        event.embedding &&
        Array.isArray(event.embedding) &&
        event.embedding.length > 0
      ) {
        return {
          id: `embedding-${event.ts}`,
          embedding: event.embedding as number[],
          source: event.source,
          facets: event.facets,
          confidence: Number(event.facets.confidence) || 0.5,
        };
      } else {
        const generated = generateEmbedding(event);
        return {
          id: `embedding-${event.ts}`,
          embedding: generated.vector,
          source: event.source,
          facets: event.facets,
          confidence: generated.confidence,
        };
      }
    });
  }, [memoryEvents]);

  // Reduce dimensions using unified utility
  const reduceDimensionsCallback = useCallback(async (embeddings: any[]) => {
    if (embeddings.length === 0) return [];

    try {
      const embeddingObjects = embeddings.map((e) => ({
        vector: e.embedding,
        confidence: e.confidence,
        source: e.source,
        timestamp: e.timestamp || 0,
      }));

      return await reduceDimensions(embeddingObjects);
    } catch (err) {
      setError("Failed to reduce dimensions. Please check the ML service.");
      console.error("Dimension reduction error:", err);
      return [];
    }
  }, []);

  // Update visualization when memory events change
  useEffect(() => {
    const updateVisualization = async () => {
      if (memoryEvents.length === 0) {
        setPoints([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const embeddings = await extractEmbeddings();

        if (embeddings.length === 0) {
          setError("No embeddings found in memory events");
          setIsLoading(false);
          return;
        }

        const reducedEmbeddings = await reduceDimensionsCallback(embeddings);

        const newPoints: Point3D[] = reducedEmbeddings.map(
          (coords: number[], index: number) => {
            const embedding = embeddings[index];
            const event = memoryEvents[index];

            // Use same projection as LatentScatter3D for consistency
            const x = (coords[0] || 0) * 200;
            const y = (coords[1] || 0) * 200;

            // Use arousal/sentiment for Z (semantic height) like scatter view
            const arousal = Number(event.facets["affect.arousal"]) || 0.5;
            const valence = Number(event.facets["affect.valence"]) || 0.5;
            const z = arousal * 80 + (valence - 0.5) * 40 + 50;

            // Color based on data source type
            let color = "#3B82F6"; // Default blue
            if (event.source === "vision") {
              color = "#00E0BE"; // Cyan for vision
            } else if (event.source === "speech") {
              color = "#1BB4F2"; // Teal for speech
            } else if (event.source === "stm") {
              color = "#FFB020"; // Amber for STM
            } else if (event.source === "ltm") {
              color = "#8B5CF6"; // Purple for LTM
            }

            // Size based on importance/confidence like scatter view
            const confidence = Number(event.facets["confidence"]) || 0.5;
            const size = Math.max(1, 3 + confidence * 4);

            return {
              x,
              y,
              z,
              event,
              isSelected: selectedEvent?.ts === event.ts,
              isWaypoint: false,
              color,
              size,
              confidence: embedding.confidence,
              source: event.source,
            };
          }
        );

        setPoints(newPoints);
      } catch (err) {
        setError("Failed to update visualization");
      } finally {
        setIsLoading(false);
      }
    };

    updateVisualization();
  }, [memoryEvents, extractEmbeddings, reduceDimensionsCallback]);

  // Update selection without recomputing embeddings
  useEffect(() => {
    setPoints((prevPoints) =>
      prevPoints.map((point) => ({
        ...point,
        isSelected: selectedEvent?.ts === point.event.ts,
      }))
    );
  }, [selectedEvent]);

  // Update camera position when preset changes
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current || !cameraData) return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;

    positionCamera(
      camera,
      cameraData.center,
      cameraData.distance,
      cameraPreset
    );
    controls.target.set(
      cameraData.center.x,
      cameraData.center.y,
      cameraData.center.z
    );
    controls.update();
  }, [cameraPreset, cameraData]);

  // Initialize Three.js scene - only once
  useEffect(() => {
    if (!mountRef.current) return;

    // Clean up any existing renderer
    if (rendererRef.current) {
      if (mountRef.current.contains(rendererRef.current.domElement)) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current.dispose();
      rendererRef.current = null;
    }

    // Remove any existing canvas elements
    const existingCanvases = mountRef.current.querySelectorAll("canvas");
    existingCanvases.forEach((canvas) => {
      if (mountRef.current && mountRef.current.contains(canvas)) {
        mountRef.current.removeChild(canvas);
      }
    });

    const scene = new THREE.Scene();
    scene.background = null;
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      CAMERA_CONFIG.fov,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      CAMERA_CONFIG.near,
      CAMERA_CONFIG.far
    );
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0.0);
    renderer.autoClear = true;
    renderer.autoClearColor = true;

    // Ensure canvas is positioned absolutely to fill the container
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 2000;
    controlsRef.current = controls;

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-50, -50, 50);
    scene.add(fillLight);

    // Add grid
    const gridHelper = new THREE.GridHelper(600, 30, 0x1e2531, 0x0f131a);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (
        mountRef.current &&
        renderer.domElement &&
        mountRef.current.contains(renderer.domElement)
      ) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  // Update 3D points and camera - single effect
  useEffect(() => {
    if (
      !sceneRef.current ||
      !rendererRef.current ||
      !cameraRef.current ||
      !controlsRef.current
    )
      return;

    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    // Clear existing meshes
    const existingMeshes = scene.children.filter(
      (child) => child instanceof THREE.Mesh
    );
    existingMeshes.forEach((mesh) => {
      scene.remove(mesh);
      if (mesh instanceof THREE.Mesh) {
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) {
          mesh.material.dispose();
        }
      }
    });

    // Clear existing lines
    const existingLines = scene.children.filter(
      (child) => child instanceof THREE.Line
    );
    existingLines.forEach((line) => {
      scene.remove(line);
      if (line instanceof THREE.Line) {
        line.geometry.dispose();
        if (line.material instanceof THREE.Material) {
          line.material.dispose();
        }
      }
    });

    if (points.length === 0) return;

    // Create spheres for each data point
    const sphereGeometry = new THREE.SphereGeometry(1, 16, 16);

    points.forEach((point, index) => {
      const sphere = new THREE.Mesh(
        sphereGeometry,
        new THREE.MeshStandardMaterial({
          color: point.color,
          transparent: true,
          opacity: 0.8,
          roughness: 0.2,
          metalness: 0.8,
        })
      );
      sphere.position.set(point.x, point.y, point.z);
      sphere.scale.setScalar(point.size);
      sphere.userData = { event: point.event, index };
      scene.add(sphere);
    });

    // Add journey lines connecting the points
    if (showTrajectory && points.length > 1) {
      const lineGeometry = new THREE.BufferGeometry();
      const positions = new Float32Array(points.length * 3);

      points.forEach((point, index) => {
        positions[index * 3] = point.x;
        positions[index * 3 + 1] = point.y;
        positions[index * 3 + 2] = point.z;
      });

      lineGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );

      const line = new THREE.Line(
        lineGeometry,
        new THREE.LineBasicMaterial({
          color: "#00E0BE",
          transparent: true,
          opacity: 0.6,
        })
      );
      scene.add(line);
    }

    // Position grid at the center of the data points
    const gridHelper = scene.children.find(
      (child) => child instanceof THREE.GridHelper
    ) as THREE.GridHelper;
    if (gridHelper && points.length > 0) {
      const avgZ =
        points.reduce((sum, point) => sum + point.z, 0) / points.length;
      gridHelper.position.y = avgZ;
    }

    // Position camera
    if (cameraData) {
      positionCamera(
        camera,
        cameraData.center,
        cameraData.distance,
        cameraPreset
      );
      controls.target.set(
        cameraData.center.x,
        cameraData.center.y,
        cameraData.center.z
      );
      controls.update();
    } else {
      // Default camera position when no points
      camera.position.set(100, 100, 100);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();
    }

    // Add click handling
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (event: MouseEvent) => {
      if (!mountRef.current) return;

      const rect = mountRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes = scene.children.filter(
        (child) => child instanceof THREE.Mesh
      );
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const intersected = intersects[0].object;
        if (intersected.userData && intersected.userData.event) {
          onSelectEvent(intersected.userData.event);
        }
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!mountRef.current) return;

      const rect = mountRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      setMousePosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });

      raycaster.setFromCamera(mouse, camera);
      const meshes = scene.children.filter(
        (child) => child instanceof THREE.Mesh
      );
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const intersected = intersects[0].object;
        if (intersected.userData && intersected.userData.event) {
          setHoveredEvent(intersected.userData.event);
          if (onHover) onHover(intersected.userData.event);
        }
      } else {
        setHoveredEvent(null);
        if (onHover) onHover(null);
      }
    };

    renderer.domElement.addEventListener("click", handleClick);
    renderer.domElement.addEventListener("mousemove", handleMouseMove);

    return () => {
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.domElement.removeEventListener("mousemove", handleMouseMove);
    };
  }, [points, cameraData, cameraPreset, onSelectEvent, onHover]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={mountRef}
        className="w-full h-full"
        style={{
          minHeight: "400px",
          width: "100%",
          height: "100%",
          position: "relative",
          overflow: "hidden",
          background: "transparent",
        }}
      />

      {isLoading && (
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-ui-dim">
            <div className="animate-spin w-8 h-8 border-2 border-ui-accent border-t-transparent rounded-full mx-auto mb-2"></div>
            <div>Computing 3D latent space...</div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute top-4 left-4 bg-red-500/50 text-white px-3 py-2 rounded">
          {error}
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
            pointerEvents: "none",
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
}

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";
import { MemoryEvent } from "../types";

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
}

export default function RealLatentSpace3D({
  memoryEvents,
  selectedEvent,
  onSelectEvent,
  onHover,
  cameraPreset = "free",
}: RealLatentSpace3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [points, setPoints] = useState<Point3D[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredEvent, setHoveredEvent] = useState<MemoryEvent | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [focusTarget, setFocusTarget] = useState<{
    x: number;
    y: number;
    z: number;
  } | null>(null);

  // Handle hover events
  const handleHover = useCallback(
    (event: MemoryEvent | null) => {
      setHoveredEvent(event);
      if (onHover) {
        onHover(event);
      }
    },
    [onHover]
  );

  // Handle focus camera on specific coordinates
  const handleFocus = useCallback((worldX: number, worldY: number) => {
    setFocusTarget({ x: worldX, y: worldY, z: 200 });
  }, []);

  // Extract embeddings from memory events
  const extractEmbeddings = useCallback(async () => {
    if (memoryEvents.length === 0) return [];

    const embeddings = [];
    for (const event of memoryEvents) {
      if (
        event.embedding &&
        Array.isArray(event.embedding) &&
        event.embedding.length > 0
      ) {
        embeddings.push({
          id: event.embedding_id,
          embedding: event.embedding as number[],
          source: event.source,
          facets: event.facets,
          confidence: Number(event.facets.confidence) || 0.5,
        });
      }
    }

    // Filter embeddings to ensure they all have the same length
    if (embeddings.length > 0) {
      const targetLength = embeddings[0].embedding.length;
      return embeddings.filter((e) => e.embedding.length === targetLength);
    }

    return embeddings;
  }, [memoryEvents]);

  // Reduce dimensions using ML service
  const reduceDimensions = useCallback(async (embeddings: any[]) => {
    if (embeddings.length === 0) return [];

    try {
      const response = await fetch("/api/embeddings/reduce-dimensions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeddings: embeddings.map((e) => e.embedding),
          method: "pca", // Use PCA for stability
          n_components: 3,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      return result.reduced_embeddings;
    } catch (err) {
      console.error("Dimension reduction failed:", err);
      setError("Failed to reduce dimensions. Please check the ML service.");
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

        const reducedEmbeddings = await reduceDimensions(embeddings);

        const newPoints: Point3D[] = reducedEmbeddings.map(
          (coords: number[], index: number) => {
            const embedding = embeddings[index];
            const event = memoryEvents.find(
              (e) => e.embedding_id === embedding.id
            )!;

            // Scale coordinates for better visualization
            const scale = 100;
            const x = coords[0] * scale;
            const y = coords[1] * scale;
            const z = coords[2] * scale;

            // Color based on source and confidence
            let color = "#3B82F6"; // Default blue
            if (event.source === "vision") {
              // Use confidence for brightness, affect for hue
              const confidence = embedding.confidence;
              const valence = Number(event.facets["affect.valence"]) || 0.5;
              const arousal = Number(event.facets["affect.arousal"]) || 0.5;

              // HSV color based on valence, brightness based on confidence
              const hue = valence * 120; // 0-120 (red to green)
              const saturation = arousal * 100;
              const value = confidence * 100;

              color = `hsl(${hue}, ${saturation}%, ${value}%)`;
            } else if (event.source === "speech") {
              color = "#10B981"; // Green for speech
            } else if (event.source === "stm") {
              color = "#FFB020"; // Amber for STM
            } else if (event.source === "ltm") {
              color = "#8B5CF6"; // Purple for LTM
            }

            // Size based on confidence and recency
            const age = Date.now() / 1000 - event.ts;
            const size = Math.max(1, 3 + embedding.confidence * 4 - age / 3600);

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
        console.error("Visualization update failed:", err);
        setError("Failed to update visualization");
      } finally {
        setIsLoading(false);
      }
    };

    updateVisualization();
  }, [memoryEvents, selectedEvent, extractEmbeddings, reduceDimensions]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Clean up any existing renderer and all canvas elements
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
    scene.background = null; // Transparent background like LatentScatter
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Set renderer clear color to transparent like LatentScatter
    renderer.setClearColor(0x000000, 0.0); // Transparent
    renderer.autoClear = true; // Enable auto-clear like LatentScatter
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
    controlsRef.current = controls;

    // Add flat lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambientLight);

    // Main directional light for clean shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Fill light for even illumination
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-50, -50, 50);
    scene.add(fillLight);

    // Add subtle grid for spatial reference
    const gridHelper = new THREE.GridHelper(200, 40, 0x333333, 0x222222);
    gridHelper.position.y = -50; // Place below the data points
    scene.add(gridHelper);

    // Add subtle axes
    const axesHelper = new THREE.AxesHelper(50);
    axesHelper.position.y = -50;
    scene.add(axesHelper);

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();

      // Let Three.js handle clearing automatically

      renderer.render(scene, camera);
    };
    animate();

    // Try a simple test - draw a colored rectangle directly to canvas

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

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      if (rendererRef.current) {
        if (
          mountRef.current &&
          mountRef.current.contains(rendererRef.current.domElement)
        ) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      if (sceneRef.current) {
        sceneRef.current = null;
      }
      if (cameraRef.current) {
        cameraRef.current = null;
      }
      if (controlsRef.current) {
        controlsRef.current = null;
      }
    };
  }, []);

  // Update 3D points
  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;

    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;

    // Remove ALL existing meshes (spheres, cubes, etc.)
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

    if (points.length === 0) {
      return;
    }

    // Create spheres for each data point with modern flat design
    const sphereGeometry = new THREE.SphereGeometry(2, 16, 16); // Appropriately sized spheres

    // Create individual spheres for each point
    points.forEach((point, index) => {
      const sphere = new THREE.Mesh(
        sphereGeometry,
        new THREE.MeshStandardMaterial({
          color: "#00E0BE", // Match LatentScatter color
          transparent: true,
          opacity: 0.8,
          roughness: 0.2,
          metalness: 0.8,
        })
      );
      sphere.position.set(point.x, point.y, point.z);
      sphere.userData = { event: point.event, index };
      scene.add(sphere);
    });

    // console.log("Total objects in scene:", scene.children.length);

    // Add journey lines connecting the points
    if (points.length > 1) {
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

    // Keep background transparent like LatentScatter
    scene.background = null;

    // Position camera to view all data points properly
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

      // Calculate the maximum dimension to ensure all points are visible
      const maxSize = Math.max(
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY,
        bounds.maxZ - bounds.minZ
      );

      // Set camera distance to encompass all points with appropriate padding
      const distance = Math.max(maxSize * 2, 10);

      // Position camera at a good viewing angle
      const cameraX = centerX + distance * 0.5;
      const cameraY = centerY + distance * 0.5;
      const cameraZ = centerZ + distance * 0.5;

      camera.position.set(cameraX, cameraY, cameraZ);
      camera.lookAt(centerX, centerY, centerZ);
    } else {
      // Default camera position when no points
      camera.position.set(50, 50, 50);
      camera.lookAt(0, 0, 0);
    }

    // Handle focus target
    if (focusTarget && controlsRef.current) {
      camera.position.set(focusTarget.x, focusTarget.y, focusTarget.z);
      camera.lookAt(focusTarget.x, focusTarget.y, 0);
      controlsRef.current.target.set(focusTarget.x, focusTarget.y, 0);
      controlsRef.current.update();
      setFocusTarget(null);
    } else if (controlsRef.current && points.length > 0) {
      // Update controls target to center of points
      const center = points.reduce(
        (acc, point) => ({
          x: acc.x + point.x,
          y: acc.y + point.y,
          z: acc.z + point.z,
        }),
        { x: 0, y: 0, z: 0 }
      );
      const centerX = center.x / points.length;
      const centerY = center.y / points.length;
      const centerZ = center.z / points.length;

      controlsRef.current.target.set(centerX, centerY, centerZ);
      controlsRef.current.update();
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
      // Only check for meshes (spheres), not lines
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

      // Update mouse position for tooltip
      setMousePosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });

      raycaster.setFromCamera(mouse, camera);
      // Only check for meshes (spheres), not lines
      const meshes = scene.children.filter(
        (child) => child instanceof THREE.Mesh
      );
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const intersected = intersects[0].object;
        if (intersected.userData && intersected.userData.event) {
          handleHover(intersected.userData.event);
        }
      } else {
        handleHover(null);
      }
    };

    renderer.domElement.addEventListener("click", handleClick);
    renderer.domElement.addEventListener("mousemove", handleMouseMove);

    return () => {
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.domElement.removeEventListener("mousemove", handleMouseMove);
    };
  }, [points, onSelectEvent, onHover, focusTarget, handleHover, handleFocus]);

  // Camera presets - only run when cameraPreset changes, not when points change
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current || points.length === 0)
      return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;

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
    const distance = Math.max(maxSize * 0.8, 30);

    switch (cameraPreset) {
      case "top":
        camera.position.set(centerX, centerY + distance, centerZ);
        camera.lookAt(centerX, centerY, centerZ);
        break;
      case "isometric":
        camera.position.set(
          centerX + distance * 0.6,
          centerY + distance * 0.6,
          centerZ + distance * 0.6
        );
        camera.lookAt(centerX, centerY, centerZ);
        break;
      case "free":
      default:
        camera.position.set(
          centerX + distance * 0.6,
          centerY + distance * 0.6,
          centerZ + distance * 0.6
        );
        camera.lookAt(centerX, centerY, centerZ);
        break;
    }

    controls.target.set(centerX, centerY, centerZ);
    controls.update();
  }, [cameraPreset]);

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
        <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-2 rounded">
          Computing embeddings...
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

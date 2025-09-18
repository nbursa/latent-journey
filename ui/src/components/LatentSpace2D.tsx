import { MemoryEvent } from "../types";
import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { Map } from "lucide-react";
import { useWaypoints, useWaypointActions } from "../stores/appStore";
import { getEmbeddingsForEvents, reduceDimensions } from "../utils/embeddings";

interface LatentSpaceViewProps {
  memoryEvents: MemoryEvent[];
  selectedEvent: MemoryEvent | null;
  onSelectEvent: (event: MemoryEvent) => void;
  showTrajectory?: boolean;
}

interface Point2D {
  x: number;
  y: number;
  event: MemoryEvent;
  isSelected: boolean;
  isWaypoint: boolean;
}

// Constants - single source of truth
const VISUALIZATION_CONFIG = {
  projectionScale: 200,
  maxWidth: 600,
  maxHeight: 400,
  margin: { top: 20, right: 20, bottom: 20, left: 20 },
  padding: 0.1,
  pointRadius: 4,
  selectedRadius: 6,
  waypointRadius: 8,
  trajectoryOpacity: 0.6,
  pointOpacity: 0.8,
  selectedOpacity: 1.0,
} as const;

const COLORS = {
  vision: "#00E0BE",
  speech: "#1BB4F2",
  stm: "#FFB020",
  ltm: "#8B5CF6",
  default: "#3B82F6",
} as const;

// Pure utility functions - testable and reusable
// generateFallbackEmbedding is now handled by the unified utility

// generateRealEmbedding is now imported from utils/embeddings

const projectTo2D = (
  embeddings: number[][],
  memoryEvents: MemoryEvent[],
  waypoints: Set<number>
): Point2D[] => {
  if (embeddings.length === 0) return [];

  return embeddings.map((embedding, index) => ({
    x: (embedding[0] || 0) * VISUALIZATION_CONFIG.projectionScale,
    y: (embedding[1] || 0) * VISUALIZATION_CONFIG.projectionScale,
    event: memoryEvents[index],
    isSelected: false,
    isWaypoint: waypoints.has(memoryEvents[index].ts),
  }));
};

const getPointColor = (source: string): string => {
  return COLORS[source as keyof typeof COLORS] || COLORS.default;
};

const getPointRadius = (point: Point2D): number => {
  if (point.isSelected) return VISUALIZATION_CONFIG.selectedRadius;
  if (point.isWaypoint) return VISUALIZATION_CONFIG.waypointRadius;
  return VISUALIZATION_CONFIG.pointRadius;
};

const getPointOpacity = (point: Point2D): number => {
  if (point.isSelected) return VISUALIZATION_CONFIG.selectedOpacity;
  return VISUALIZATION_CONFIG.pointOpacity;
};

export default function LatentSpaceView({
  memoryEvents,
  selectedEvent,
  onSelectEvent,
  showTrajectory = true,
}: LatentSpaceViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [points, setPoints] = useState<Point2D[]>([]);
  const [isComputing, setIsComputing] = useState(false);

  const waypoints = useWaypoints();
  const { toggleWaypoint } = useWaypointActions();

  // Memoized embedding extraction - only recalculates when memoryEvents change
  const extractEmbeddings = useCallback(async () => {
    if (memoryEvents.length === 0) return [];

    const embeddings = await getEmbeddingsForEvents(memoryEvents, {
      concurrency: 6,
    });

    return embeddings.map((e) => e.vector);
  }, [memoryEvents]);

  // Heavy computation: embeddings + reduction (only when memoryEvents change)
  useEffect(() => {
    if (memoryEvents.length === 0) {
      setPoints([]);
      return;
    }

    setIsComputing(true);

    const processEmbeddings = async () => {
      try {
        const embeddings = await extractEmbeddings();
        const reducedEmbeddings = await reduceDimensions(
          embeddings.map((e) => ({
            vector: e,
            confidence: 0.8,
            source: "unknown",
            timestamp: 0,
          })),
          2 // Use 2 dimensions for 2D visualization
        );
        const projectedPoints = projectTo2D(
          reducedEmbeddings,
          memoryEvents,
          waypoints
        );

        setPoints(projectedPoints);
        setIsComputing(false);
      } catch (error) {
        console.error("Error processing embeddings:", error);
        setPoints([]);
        setIsComputing(false);
      }
    };

    processEmbeddings();
  }, [memoryEvents, extractEmbeddings]);

  // Light updates: selection and waypoint states (no recomputation)
  useEffect(() => {
    setPoints((prevPoints) =>
      prevPoints.map((point) => ({
        ...point,
        isSelected: selectedEvent?.ts === point.event.ts,
        isWaypoint: waypoints.has(point.event.ts),
      }))
    );
  }, [selectedEvent, waypoints]);

  // Initialize SVG structure (only runs once)
  const initializeSVG = useCallback(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);

    // Get container dimensions
    const container = svgRef.current?.parentElement;
    const containerWidth = container?.clientWidth || 400;
    const containerHeight = container?.clientHeight || 300;

    const width = Math.min(containerWidth, VISUALIZATION_CONFIG.maxWidth);
    const height = Math.min(containerHeight, VISUALIZATION_CONFIG.maxHeight);
    const margin = VISUALIZATION_CONFIG.margin;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Clear and setup SVG
    svg.selectAll("*").remove();

    const g = svg
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create static elements
    g.append("g").attr("class", "x-axis");
    g.append("g").attr("class", "y-axis");
    g.append("g").attr("class", "points");
    g.append("g").attr("class", "trajectory");
    g.append("g").attr("class", "legend");

    return { g, width, height, innerWidth, innerHeight, margin };
  }, []);

  // Update visualization data (runs when points change)
  const updateVisualization = useCallback(() => {
    if (!svgRef.current || points.length === 0) return;

    const svg = d3.select(svgRef.current);
    const g = svg.select("g");

    if (g.empty()) {
      initializeSVG();
      return;
    }

    // Get container dimensions
    const container = svgRef.current?.parentElement;
    const containerWidth = container?.clientWidth || 400;
    const containerHeight = container?.clientHeight || 300;

    const width = Math.min(containerWidth, VISUALIZATION_CONFIG.maxWidth);
    const height = Math.min(containerHeight, VISUALIZATION_CONFIG.maxHeight);
    const margin = VISUALIZATION_CONFIG.margin;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Update SVG dimensions
    svg.attr("viewBox", `0 0 ${width} ${height}`);
    g.attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    const xExtent = d3.extent(points, (d) => d.x) as [number, number];
    const yExtent = d3.extent(points, (d) => d.y) as [number, number];

    // Add padding to ensure points are visible
    const xPadding =
      (xExtent[1] - xExtent[0]) * VISUALIZATION_CONFIG.padding || 10;
    const yPadding =
      (yExtent[1] - yExtent[0]) * VISUALIZATION_CONFIG.padding || 10;

    const xScale = d3
      .scaleLinear()
      .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
      .range([0, innerWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
      .range([innerHeight, 0]);

    // Update trajectory line
    const trajectoryGroup = g.select(".trajectory");
    if (showTrajectory && points.length > 1) {
      const line = d3
        .line<Point2D>()
        .x((d) => xScale(d.x))
        .y((d) => yScale(d.y));

      // Sort points by timestamp for proper trajectory order
      const sortedPoints = [...points].sort((a, b) => a.event.ts - b.event.ts);

      const trajectoryPath = trajectoryGroup
        .selectAll("path")
        .data([sortedPoints]);

      trajectoryPath.exit().remove();

      trajectoryPath
        .enter()
        .append("path")
        .merge(trajectoryPath as any)
        .attr("fill", "none")
        .attr("stroke", "#00E0BE")
        .attr("stroke-width", 2)
        .attr("opacity", VISUALIZATION_CONFIG.trajectoryOpacity)
        .attr("d", line);
    } else {
      trajectoryGroup.selectAll("path").remove();
    }

    // Update points using data-join
    const pointGroup = g.select(".points");
    const circles = pointGroup
      .selectAll("circle")
      .data(points, (d: any) => d.event.ts); // Key function for stable updates

    // Remove old points
    circles.exit().remove();

    // Add new points
    const newCircles = circles
      .enter()
      .append("circle")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        onSelectEvent(d.event);
      })
      .on("dblclick", (event, d) => {
        event.stopPropagation();
        toggleWaypoint(d.event.ts);
      });

    // Update all points (new + existing)
    circles
      .merge(newCircles as any)
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", getPointRadius)
      .attr("fill", (d) => getPointColor(d.event.source))
      .attr("opacity", getPointOpacity)
      .attr("stroke", (d) => (d.isSelected ? "#ffffff" : "none"))
      .attr("stroke-width", (d) => (d.isSelected ? 2 : 0));

    // Update axes
    const xAxis = d3
      .axisBottom(xScale)
      .tickSize(0)
      .tickFormat(() => "");
    const yAxis = d3
      .axisLeft(yScale)
      .tickSize(0)
      .tickFormat(() => "");

    g.select(".x-axis")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(xAxis as any);

    g.select(".y-axis").call(yAxis as any);

    // Update legend
    const legend = g
      .select(".legend")
      .attr("transform", `translate(${innerWidth - 100}, 10)`);

    // Clear and recreate legend items
    legend.selectAll("*").remove();

    // Vision
    legend
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 4)
      .attr("fill", COLORS.vision);

    legend
      .append("text")
      .attr("x", 12)
      .attr("y", 4)
      .text("Vision")
      .style("font-size", "8px")
      .style("fill", "#9CA3AF");

    // Speech
    legend
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 16)
      .attr("r", 4)
      .attr("fill", COLORS.speech);

    legend
      .append("text")
      .attr("x", 12)
      .attr("y", 20)
      .text("Speech")
      .style("font-size", "8px")
      .style("fill", "#9CA3AF");

    // STM
    legend
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 32)
      .attr("r", 4)
      .attr("fill", COLORS.stm);

    legend
      .append("text")
      .attr("x", 12)
      .attr("y", 36)
      .text("STM")
      .style("font-size", "8px")
      .style("fill", "#9CA3AF");

    // LTM
    legend
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 48)
      .attr("r", 4)
      .attr("fill", COLORS.ltm);

    legend
      .append("text")
      .attr("x", 12)
      .attr("y", 52)
      .text("LTM")
      .style("font-size", "8px")
      .style("fill", "#9CA3AF");

    // Waypoint
    legend
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 64)
      .attr("r", 6)
      .attr("fill", "none")
      .attr("stroke", "#FFD700")
      .attr("stroke-width", 2);

    legend
      .append("text")
      .attr("x", 12)
      .attr("y", 68)
      .text("Waypoint")
      .style("font-size", "8px")
      .style("fill", "#9CA3AF");
  }, [
    points,
    selectedEvent,
    onSelectEvent,
    showTrajectory,
    toggleWaypoint,
    initializeSVG,
  ]);

  // Initialize SVG on mount
  useEffect(() => {
    initializeSVG();
  }, [initializeSVG]);

  // Update visualization when data changes
  useEffect(() => {
    updateVisualization();
  }, [updateVisualization]);

  // Handle resize
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      updateVisualization();
    });

    if (svgRef.current && svgRef.current.parentElement) {
      resizeObserver.observe(svgRef.current.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateVisualization]);

  return (
    <div className="h-full flex flex-col min-h-0 p-2">
      <div className="flex-1 p-4 min-h-0 overflow-hidden">
        {isComputing ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-ui-dim">
              <div className="animate-spin w-8 h-8 border-2 border-ui-accent border-t-transparent rounded-full mx-auto mb-2"></div>
              <div>Computing 2D latent space...</div>
            </div>
          </div>
        ) : points.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Map className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <div className="text-lg mb-2">No data yet</div>
              <div className="text-sm">
                Capture some images or speak to see the latent space
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full w-full min-h-0">
            <svg ref={svgRef} className="w-full h-full" />
          </div>
        )}
      </div>

      {points.length > 0 && (
        <div className="mt-4 text-xs text-gray-400 flex-shrink-0">
          <div className="flex items-center gap-4">
            <span>Points: {points.length}</span>
            <span>Waypoints: {waypoints.size}</span>
          </div>
        </div>
      )}
    </div>
  );
}

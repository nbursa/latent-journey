import { MemoryEvent } from "../types";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Map, RotateCcw } from "lucide-react";
import { useWaypoints, useWaypointActions } from "../stores/appStore";

interface LatentSpaceViewProps {
  memoryEvents: MemoryEvent[];
  selectedEvent: MemoryEvent | null;
  onSelectEvent: (event: MemoryEvent) => void;
}

interface Point2D {
  x: number;
  y: number;
  event: MemoryEvent;
  isSelected: boolean;
  isWaypoint: boolean;
}

export default function LatentSpaceView({
  memoryEvents,
  selectedEvent,
  onSelectEvent,
}: LatentSpaceViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [points, setPoints] = useState<Point2D[]>([]);
  const [isComputing, setIsComputing] = useState(false);

  // Get waypoints from store
  const waypoints = useWaypoints();
  const { toggleWaypoint, clearWaypoints } = useWaypointActions();

  // Simple 2D projection using PCA-like approach
  const projectTo2D = (embeddings: number[][]) => {
    if (embeddings.length === 0) return [];

    // Simple 2D projection: use first two dimensions
    return embeddings.map((embedding, index) => ({
      x: (embedding[0] || 0) * 100 + Math.random() * 20 - 10, // Add some noise
      y: (embedding[1] || 0) * 100 + Math.random() * 20 - 10,
      event: memoryEvents[index],
      isSelected: false,
      isWaypoint: waypoints.has(memoryEvents[index].ts),
    }));
  };

  // Extract embeddings from memory events
  const extractEmbeddings = () => {
    // For now, create mock embeddings based on facets
    return memoryEvents.map((event) => {
      const facets = event.facets;
      const embedding = new Array(128).fill(0);

      // Create mock embedding based on facets
      if (facets["vision.object"]) {
        const object = String(facets["vision.object"]).toLowerCase();
        embedding[0] = object.includes("banana") ? 0.8 : 0.2;
        embedding[1] = object.includes("apple") ? 0.8 : 0.2;
        embedding[2] = object.includes("cup") ? 0.8 : 0.2;
      }

      if (facets["speech.intent"]) {
        const intent = String(facets["speech.intent"]).toLowerCase();
        embedding[3] = intent.includes("greeting") ? 0.8 : 0.2;
        embedding[4] = intent.includes("question") ? 0.8 : 0.2;
        embedding[5] = intent.includes("statement") ? 0.8 : 0.2;
      }

      if (facets["affect.valence"]) {
        embedding[6] = Number(facets["affect.valence"]);
      }

      if (facets["affect.arousal"]) {
        embedding[7] = Number(facets["affect.arousal"]);
      }

      return embedding;
    });
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
      const embeddings = extractEmbeddings();
      const projectedPoints = projectTo2D(embeddings);

      // Update selected state
      const updatedPoints = projectedPoints.map((point) => ({
        ...point,
        isSelected: selectedEvent?.ts === point.event.ts,
      }));

      setPoints(updatedPoints);
      setIsComputing(false);
    }, 500);
  }, [memoryEvents, selectedEvent, waypoints]);

  // Render D3 visualization
  useEffect(() => {
    if (!svgRef.current || points.length === 0) return;

    const renderVisualization = () => {
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      // Get container dimensions
      const container = svgRef.current?.parentElement;
      const containerWidth = container?.clientWidth || 400;
      const containerHeight = container?.clientHeight || 300;

      const width = Math.min(containerWidth, 600); // Max width for readability
      const height = Math.min(containerHeight, 400); // Max height for readability
      const margin = { top: 20, right: 20, bottom: 20, left: 20 };
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Create scales
      const xScale = d3
        .scaleLinear()
        .domain(d3.extent(points, (d) => d.x) as [number, number])
        .range([0, innerWidth]);

      const yScale = d3
        .scaleLinear()
        .domain(d3.extent(points, (d) => d.y) as [number, number])
        .range([innerHeight, 0]);

      // Add axes
      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).tickSize(0))
        .selectAll("text")
        .style("fill", "#9CA3AF");

      g.append("g")
        .call(d3.axisLeft(yScale).tickSize(0))
        .selectAll("text")
        .style("fill", "#9CA3AF");

      // Draw trajectory lines
      g.append("path")
        .datum(points)
        .attr("fill", "none")
        .attr("stroke", "#3B82F6")
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.6)
        .attr(
          "d",
          d3
            .line<Point2D>()
            .x((d) => xScale(d.x))
            .y((d) => yScale(d.y))
        );

      // Draw points
      g.selectAll("circle")
        .data(points)
        .enter()
        .append("circle")
        .attr("cx", (d) => xScale(d.x))
        .attr("cy", (d) => yScale(d.y))
        .attr("r", (d) => (d.isSelected ? 8 : d.isWaypoint ? 6 : 4))
        .attr("fill", (d) => {
          if (d.isSelected) return "#EF4444";
          if (d.isWaypoint) return "#F59E0B";
          return d.event.source === "vision" ? "#3B82F6" : "#10B981";
        })
        .attr("stroke", (d) => (d.isSelected ? "#FFFFFF" : "none"))
        .attr("stroke-width", (d) => (d.isSelected ? 2 : 0))
        .style("cursor", "pointer")
        .on("click", (_, d) => {
          onSelectEvent(d.event);
        })
        .on("contextmenu", (event, d) => {
          event.preventDefault();
          handleToggleWaypoint(d.event);
        })
        .on("mouseover", function (event, d) {
          d3.select(this).attr("r", 8);

          // Show tooltip
          const tooltip = d3
            .select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0,0,0,0.8)")
            .style("color", "white")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000");

          const facets = Object.entries(d.event.facets)
            .map(([key, value]) => `${key}: ${value}`)
            .join("<br/>");

          tooltip.html(`
          <div><strong>${d.event.source}</strong></div>
          <div>${new Date(d.event.ts * 1000).toLocaleTimeString()}</div>
          <div>${facets}</div>
        `);

          tooltip
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 10 + "px");
        })
        .on("mouseout", function (_, d: Point2D) {
          d3.select(this).attr("r", () =>
            d.isSelected ? 8 : d.isWaypoint ? 6 : 4
          );
          d3.selectAll(".tooltip").remove();
        });

      // Add legend
      const legend = g
        .append("g")
        .attr("transform", `translate(${innerWidth - 120}, 20)`);

      legend
        .append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 4)
        .attr("fill", "#3B82F6");
      legend
        .append("text")
        .attr("x", 12)
        .attr("y", 4)
        .text("Vision")
        .style("font-size", "12px")
        .style("fill", "#9CA3AF");

      legend
        .append("circle")
        .attr("cx", 0)
        .attr("cy", 20)
        .attr("r", 4)
        .attr("fill", "#10B981");
      legend
        .append("text")
        .attr("x", 12)
        .attr("y", 24)
        .text("Speech")
        .style("font-size", "12px")
        .style("fill", "#9CA3AF");

      legend
        .append("circle")
        .attr("cx", 0)
        .attr("cy", 40)
        .attr("r", 6)
        .attr("fill", "#F59E0B");
      legend
        .append("text")
        .attr("x", 12)
        .attr("y", 44)
        .text("Waypoint")
        .style("font-size", "12px")
        .style("fill", "#9CA3AF");
    };

    // Initial render
    renderVisualization();

    // Add resize observer for responsive updates
    const resizeObserver = new ResizeObserver(() => {
      renderVisualization();
    });

    if (svgRef.current && svgRef.current.parentElement) {
      resizeObserver.observe(svgRef.current.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [points, selectedEvent, onSelectEvent]);

  const handleToggleWaypoint = (event: MemoryEvent) => {
    toggleWaypoint(event.ts);
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Map className="w-5 h-5" />
          Latent Space Map
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

      <div className="flex-1 glass flat p-4 min-h-0 overflow-hidden">
        {isComputing ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <div>Computing latent space...</div>
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
            <span>Click points to select • Right-click to bookmark</span>
          </div>
        </div>
      )}
    </div>
  );
}

import { MemoryEvent } from "../types";
import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Map } from "lucide-react";
import { useWaypoints, useWaypointActions } from "../stores/appStore";

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
    // Create embeddings based on stored facets
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
        // Distribute object features across multiple dimensions
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
        // Spread valence across multiple dimensions
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

      // STM/LTM specific features (dimensions 90-99)
      if (event.source === "stm" || event.source === "ltm") {
        const content = event.content || "";
        const contentHash = content.split("").reduce((a, b) => {
          a = (a << 5) - a + b.charCodeAt(0);
          return a & a;
        }, 0);
        for (let i = 90; i < 100; i++) {
          embedding[i] = Math.cos(contentHash + i) * 0.5 + 0.5;
        }
      }

      // Temporal features (dimensions 100-109)
      const timeHash = event.ts
        .toString()
        .split("")
        .reduce((a, b) => {
          a = (a << 5) - a + parseInt(b);
          return a & a;
        }, 0);
      for (let i = 100; i < 110; i++) {
        embedding[i] = Math.cos(timeHash + i) * 0.5 + 0.5;
      }

      for (let i = 110; i < 128; i++) {
        embedding[i] = Math.random() * 0.1 - 0.05;
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

      // Draw trajectory lines with temporal progression
      if (showTrajectory && points.length > 1) {
        // Sort points by timestamp for proper temporal ordering
        const sortedPoints = [...points].sort(
          (a, b) => a.event.ts - b.event.ts
        );

        // Create gradient for temporal progression
        const gradient = svg
          .append("defs")
          .append("linearGradient")
          .attr("id", "trajectory-gradient")
          .attr("gradientUnits", "userSpaceOnUse")
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", innerWidth)
          .attr("y2", innerHeight);

        gradient
          .append("stop")
          .attr("offset", "0%")
          .attr("stop-color", "#00E0BE")
          .attr("stop-opacity", 0.3);

        gradient
          .append("stop")
          .attr("offset", "100%")
          .attr("stop-color", "#1BB4F2")
          .attr("stop-opacity", 0.8);

        // Draw trajectory line
        g.append("path")
          .datum(sortedPoints)
          .attr("fill", "none")
          .attr("stroke", "url(#trajectory-gradient)")
          .attr("stroke-width", 3)
          .attr("stroke-opacity", 0.8)
          .attr("stroke-linecap", "round")
          .attr("stroke-linejoin", "round")
          .attr(
            "d",
            d3
              .line<Point2D>()
              .x((d) => xScale(d.x))
              .y((d) => yScale(d.y))
          );

        // Add temporal markers along the trajectory
        sortedPoints.forEach((point, index) => {
          if (index > 0) {
            const progress = index / (sortedPoints.length - 1);
            const x = xScale(point.x);
            const y = yScale(point.y);

            // Add small temporal marker with progress-based opacity
            g.append("circle")
              .attr("cx", x)
              .attr("cy", y)
              .attr("r", 2)
              .attr("fill", "#00E0BE")
              .attr("opacity", 0.3 + progress * 0.7) // Fade in over time
              .attr("stroke", "white")
              .attr("stroke-width", 1);
          }
        });
      }

      // Draw points
      const circles = g
        .selectAll<SVGCircleElement, Point2D>("circle")
        .data(points);

      circles.exit().remove();

      const circlesEnter = circles.enter().append("circle");

      // Merge enter and update selections
      const circlesMerged = circlesEnter.merge(circles);

      circlesMerged
        .attr("cx", (d) => xScale(d.x))
        .attr("cy", (d) => yScale(d.y))
        .attr("r", (d) => (d.isSelected ? 8 : d.isWaypoint ? 6 : 4))
        .attr("fill", (d) => {
          if (d.isSelected) return "#00E0BE";
          if (d.isWaypoint) return "#FFB020";
          if (d.event.source === "vision") return "#00E0BE";
          if (d.event.source === "speech") return "#1BB4F2";
          if (d.event.source === "stm") return "#FFB020";
          if (d.event.source === "ltm") return "#8B5CF6";
          return "#3B82F6"; // Default blue
        })
        .attr("stroke", (d) => (d.isSelected ? "#FFFFFF" : "none"))
        .attr("stroke-width", (d) => (d.isSelected ? 2 : 0))
        .style("cursor", "pointer")
        .on("click", (_, d) => {
          d3.selectAll(".tooltip").remove();
          onSelectEvent(d.event);
        })
        .on("contextmenu", (event, d) => {
          event.preventDefault();
          handleToggleWaypoint(d.event);
        })
        .on("mouseover", function (event, d) {
          d3.select(this).attr("r", 8);

          // Show enhanced tooltip
          const tooltip = d3
            .select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0,0,0,0.9)")
            .style("color", "white")
            .style("padding", "12px")
            .style("border-radius", "8px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000")
            .style("border", "1px solid #00E0BE")
            .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)")
            .style("max-width", "300px");

          const facets = Object.entries(d.event.facets)
            .slice(0, 3)
            .map(
              ([key, value]) =>
                `<div><span style="color: #00E0BE">${key}:</span> ${value}</div>`
            )
            .join("");

          tooltip.html(`
            <div style="font-weight: bold; color: #00E0BE; margin-bottom: 4px;">${d.event.source.toUpperCase()}</div>
            <div style="color: #9CA3AF; margin-bottom: 8px;">${new Date(
              d.event.ts * 1000
            ).toLocaleTimeString()}</div>
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

      // Legend
      const legend = g
        .append("g")
        .attr(
          "transform",
          `translate(${innerWidth + 20}, ${innerHeight - 240})`
        );

      legend
        .append("rect")
        .attr("x", -10)
        .attr("y", -10)
        .attr("width", 100)
        .attr("height", 100)
        .attr("fill", "rgba(0, 0, 0, 0.25)")
        .attr("rx", 4);

      legend
        .append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 4)
        .attr("fill", "#00E0BE");
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
        .attr("fill", "#1BB4F2");
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
        .attr("r", 4)
        .attr("fill", "#FFB020");
      legend
        .append("text")
        .attr("x", 12)
        .attr("y", 44)
        .text("STM")
        .style("font-size", "12px")
        .style("fill", "#9CA3AF");

      legend
        .append("circle")
        .attr("cx", 0)
        .attr("cy", 60)
        .attr("r", 4)
        .attr("fill", "#8B5CF6");
      legend
        .append("text")
        .attr("x", 12)
        .attr("y", 64)
        .text("LTM")
        .style("font-size", "12px")
        .style("fill", "#9CA3AF");

      legend
        .append("circle")
        .attr("cx", 0)
        .attr("cy", 80)
        .attr("r", 6)
        .attr("fill", "#FFB020");
      legend
        .append("text")
        .attr("x", 12)
        .attr("y", 84)
        .text("Waypoint")
        .style("font-size", "12px")
        .style("fill", "#9CA3AF");
    };

    renderVisualization();

    const resizeObserver = new ResizeObserver(() => {
      renderVisualization();
    });

    if (svgRef.current && svgRef.current.parentElement) {
      resizeObserver.observe(svgRef.current.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [points, selectedEvent, onSelectEvent, showTrajectory]);

  const handleToggleWaypoint = (event: MemoryEvent) => {
    toggleWaypoint(event.ts);
  };

  return (
    <div className="h-full flex flex-col min-h-0 p-2">
      <div className="flex-1 p-4 min-h-0 overflow-hidden">
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
          </div>
        </div>
      )}
    </div>
  );
}

import { Map } from "lucide-react";

interface Point2D {
  x: number;
  y: number;
  event: any;
  isSelected: boolean;
  isWaypoint: boolean;
  color: string;
  source: string;
}

interface UnifiedMiniMapProps {
  points: Point2D[];
  onFocus: (x: number, y: number) => void;
  onSelectEvent: (event: any) => void;
  selectedEvent: any;
  cameraPosition?: { x: number; y: number; z: number };
  showTrajectory?: boolean;
  className?: string;
}

export default function UnifiedMiniMap({
  points,
  onFocus,
  onSelectEvent,
  selectedEvent,
  cameraPosition,
  showTrajectory = true,
  className = "",
}: UnifiedMiniMapProps) {
  const filteredPoints = points;

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

  const handlePointClick = (point: Point2D, event: React.MouseEvent) => {
    event.stopPropagation();
    onSelectEvent(point.event);
  };

  // Calculate camera viewport bounds for indicator (if 3D)
  const viewportSize = 30;
  let cameraX = 50;
  let cameraY = 50;

  if (cameraPosition) {
    cameraX = ((cameraPosition.x - centerX + rangeX / 2) / rangeX) * 100;
    cameraY = ((cameraPosition.y - centerY + rangeY / 2) / rangeY) * 100;
  }

  return (
    <div
      className={`absolute bottom-4 right-4 w-60 h-50 glass flat border border-ui-border overflow-visible z-10 ${className}`}
    >
      {/* Header with controls */}
      <div className="p-2 text-xs text-ui-dim border-b border-ui-border flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Map className="w-3 h-3" />
          Mini Map
        </span>
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
              stroke="#00E0BE"
              strokeWidth="1"
              opacity="0.6"
              strokeLinecap="round"
              strokeLinejoin="round"
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

        {/* Camera viewport indicator (for 3D views) */}
        {cameraPosition && (
          <div
            className="absolute border border-ui-accent border-dashed opacity-60 pointer-events-none"
            style={{
              left: `${Math.max(
                0,
                Math.min(100, cameraX - viewportSize / 2)
              )}%`,
              top: `${Math.max(0, Math.min(100, cameraY - viewportSize / 2))}%`,
              width: `${viewportSize}%`,
              height: `${viewportSize}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        )}

        {/* Center crosshair */}
        <div className="absolute top-1/2 left-1/2 w-4 h-4 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-full h-px bg-ui-accent opacity-30"></div>
          <div className="w-px h-full bg-ui-accent opacity-30"></div>
        </div>
      </div>
    </div>
  );
}

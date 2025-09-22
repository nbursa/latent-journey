import { TrendingUp, TrendingDown } from "lucide-react";

interface TrendChartProps {
  data: number[];
  title: string;
  confidenceInterval?: [number, number];
  trend?: number;
  className?: string;
}

export default function TrendChart({
  data,
  title,
  confidenceInterval,
  trend,
  className = "",
}: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className={`p-4 bg-ui-surface rounded-lg ${className}`}>
        <h4 className="text-sm font-medium text-ui-text mb-2">{title}</h4>
        <p className="text-xs text-ui-dim">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data);
  const minValue = Math.min(...data);
  const range = maxValue - minValue || 1;

  // Simple SVG chart
  const width = 200;
  const height = 80;
  const padding = 10;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * chartWidth + padding;
    const y = height - padding - ((value - minValue) / range) * chartHeight;
    return `${x},${y}`;
  }).join(" ");

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend > 0) return <TrendingUp className="w-3 h-3 text-green-400" />;
    if (trend < 0) return <TrendingDown className="w-3 h-3 text-red-400" />;
    return null;
  };

  const getTrendColor = () => {
    if (!trend) return "text-ui-dim";
    if (trend > 0) return "text-green-400";
    if (trend < 0) return "text-red-400";
    return "text-ui-dim";
  };

  return (
    <div className={`p-4 bg-ui-surface rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-ui-text">{title}</h4>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="font-mono">{trend.toFixed(4)}</span>
          </div>
        )}
      </div>

      <div className="relative">
        <svg width={width} height={height} className="w-full">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Confidence interval band */}
          {confidenceInterval && (
            <rect
              x={padding}
              y={height - padding - ((confidenceInterval[1] - minValue) / range) * chartHeight}
              width={chartWidth}
              height={((confidenceInterval[1] - confidenceInterval[0]) / range) * chartHeight}
              fill="currentColor"
              opacity="0.1"
            />
          )}
          
          {/* Trend line */}
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-ui-accent"
            points={points}
          />
          
          {/* Data points */}
          {data.map((value, index) => {
            const x = (index / (data.length - 1)) * chartWidth + padding;
            const y = height - padding - ((value - minValue) / range) * chartHeight;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="2"
                fill="currentColor"
                className="text-ui-accent"
              />
            );
          })}
        </svg>
        
        {/* Value labels */}
        <div className="flex justify-between text-xs text-ui-dim mt-1">
          <span>{minValue.toFixed(3)}</span>
          <span>{maxValue.toFixed(3)}</span>
        </div>
      </div>

      {/* Confidence interval info */}
      {confidenceInterval && (
        <div className="mt-2 text-xs text-ui-dim">
          <span>95% CI: [{confidenceInterval[0].toFixed(4)}, {confidenceInterval[1].toFixed(4)}]</span>
        </div>
      )}
    </div>
  );
}

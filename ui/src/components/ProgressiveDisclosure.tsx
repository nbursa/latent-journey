import { useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";

interface ProgressiveDisclosureProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  level?: "primary" | "secondary" | "tertiary";
  showExplainer?: boolean;
  explainerText?: string;
  className?: string;
}

export default function ProgressiveDisclosure({
  title,
  children,
  defaultExpanded = false,
  level = "primary",
  showExplainer = false,
  explainerText,
  className = "",
}: ProgressiveDisclosureProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showExplainerTooltip, setShowExplainerTooltip] = useState(false);

  const levelStyles = {
    primary: "text-ui-text font-medium",
    secondary: "text-ui-dim font-normal",
    tertiary: "text-ui-dim text-sm font-normal",
  };

  const expandIcon = isExpanded ? (
    <ChevronDown className="w-4 h-4" />
  ) : (
    <ChevronRight className="w-4 h-4" />
  );

  return (
    <div className={`glass p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 hover:text-ui-accent transition-colors"
          >
            {expandIcon}
            <span className={levelStyles[level]}>{title}</span>
          </button>

          {showExplainer && (
            <div className="relative">
              <button
                onMouseEnter={() => setShowExplainerTooltip(true)}
                onMouseLeave={() => setShowExplainerTooltip(false)}
                className="text-ui-dim hover:text-ui-accent transition-colors"
              >
                <Info className="w-3 h-3" />
              </button>

              {showExplainerTooltip && (
                <div className="absolute bottom-full left-0 mb-2 p-2 bg-black text-xs text-ui-text max-w-xs z-10">
                  {explainerText}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isExpanded && <div className="space-y-3 animate-fadeIn">{children}</div>}
    </div>
  );
}

// Facet Display Component
interface FacetDisplayProps {
  facets: Record<string, any>;
  maxItems?: number;
  showRaw?: boolean;
}

export function FacetDisplay({
  facets,
  maxItems = 5,
  showRaw = false,
}: FacetDisplayProps) {
  const [showAll, setShowAll] = useState(false);
  const facetEntries = Object.entries(facets);
  const visibleFacets = showAll
    ? facetEntries
    : facetEntries.slice(0, maxItems);

  return (
    <div className="space-y-2">
      {visibleFacets.map(([key, value]) => (
        <div key={key} className="flex items-center justify-between text-sm">
          <span className="text-ui-dim font-mono text-xs">{key}:</span>
          <span className="text-ui-text text-right max-w-xs truncate">
            {showRaw ? JSON.stringify(value) : String(value)}
          </span>
        </div>
      ))}

      {facetEntries.length > maxItems && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-ui-accent hover:text-ui-accent-2 transition-colors"
        >
          {showAll
            ? "Show less"
            : `Show ${facetEntries.length - maxItems} more`}
        </button>
      )}
    </div>
  );
}

// CLIP Logits Display
interface CLIPLogitsProps {
  logits: number[];
  labels: string[];
  topK?: number;
}

export function CLIPLogits({ logits, labels, topK = 5 }: CLIPLogitsProps) {
  const sortedLogits = logits
    .map((logit, index) => ({
      logit,
      label: labels[index] || `Label ${index}`,
    }))
    .sort((a, b) => b.logit - a.logit)
    .slice(0, topK);

  return (
    <div className="space-y-2">
      <div className="text-xs text-ui-dim mb-2">
        Top {topK} CLIP predictions:
      </div>
      {sortedLogits.map(({ logit, label }, index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="w-2 h-2 bg-ui-accent rounded-full" />
          <span className="text-sm text-ui-text flex-1">{label}</span>
          <span className="text-xs text-ui-dim font-mono">
            {logit.toFixed(3)}
          </span>
        </div>
      ))}
    </div>
  );
}

// Raw Transcript Display
interface RawTranscriptProps {
  transcript: string;
  maxLength?: number;
}

export function RawTranscript({
  transcript,
  maxLength = 200,
}: RawTranscriptProps) {
  const [showFull, setShowFull] = useState(false);
  const displayText = showFull ? transcript : transcript.slice(0, maxLength);
  const isTruncated = transcript.length > maxLength;

  return (
    <div className="space-y-2">
      <div className="text-xs text-ui-dim mb-2">Raw transcript:</div>
      <div className="bg-ui-surface/50 p-3 rounded border border-ui-border">
        <pre className="text-sm text-ui-text font-mono whitespace-pre-wrap">
          {displayText}
          {isTruncated && !showFull && "..."}
        </pre>
        {isTruncated && (
          <button
            onClick={() => setShowFull(!showFull)}
            className="text-xs text-ui-accent hover:text-ui-accent-2 transition-colors mt-2"
          >
            {showFull ? "Show less" : "Show full transcript"}
          </button>
        )}
      </div>
    </div>
  );
}

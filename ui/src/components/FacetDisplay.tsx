import { FacetDisplayProps } from "../types";

export default function FacetDisplay({ facets }: FacetDisplayProps) {
  // Label mapping for better display names
  const labelMap: Record<string, string> = {
    "speech.transcript": "Speech Transcript",
    "speech.intent": "Speech Intent",
    "speech.sentiment": "Speech Sentiment",
    "vision.object": "Vision Object",
    "color.dominant": "Dominant Color",
    "affect.valence": "Affect Valence",
    "affect.arousal": "Affect Arousal",
  };

  // Sort facets by category: speech.*, vision.*, color.*, affect.*
  const sortedEntries = Object.entries(facets).sort(([a], [b]) => {
    const getCategory = (key: string) => {
      if (key.startsWith("speech.")) return 0;
      if (key.startsWith("vision.")) return 1;
      if (key.startsWith("color.")) return 2;
      if (key.startsWith("affect.")) return 3;
      return 4;
    };
    return getCategory(a) - getCategory(b);
  });

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-300 mb-2">Facets:</div>
      {sortedEntries.map(([key, value]) => (
        <div key={key} className="flex items-center gap-2">
          <span
            className="text-xs text-white min-w-0 flex-1 truncate"
            title={
              key === "affect.valence"
                ? "Valence: Emotional positivity/negativity (-1 to +1, where +1 is most positive)"
                : key === "affect.arousal"
                ? "Arousal: Emotional intensity/energy (0 to 1, where 1 is most intense)"
                : undefined
            }
          >
            {labelMap[key] || key}:
          </span>
          {(key === "affect.valence" || key === "affect.arousal") &&
          typeof value === "number" ? (
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width:
                      key === "affect.valence"
                        ? `${((value + 1) / 2) * 100}%`
                        : `${value * 100}%`,
                    background:
                      key === "affect.valence"
                        ? value >= 0
                          ? "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))"
                          : "linear-gradient(90deg, var(--accent-secondary), var(--accent-primary))"
                        : "linear-gradient(90deg, var(--accent-tertiary), var(--accent-quaternary))",
                  }}
                />
              </div>
              <span className="text-xs text-gray-400 min-w-0">
                {value.toFixed(2)}
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-300 min-w-0">
              {String(value)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

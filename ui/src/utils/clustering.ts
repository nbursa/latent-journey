import { MemoryEvent } from "../types";
import { getEmbeddingForEvent } from "./embeddings";

// Embedding generation is now handled by the unified utility

export interface Cluster {
  id: string;
  center: number[];
  points: MemoryEvent[];
  label: string;
  color: string;
  size: number;
}

export interface SemanticGroup {
  id: string;
  name: string;
  description: string;
  events: MemoryEvent[];
  keywords: string[];
  color: string;
}

// Simple K-means clustering for embeddings
export async function clusterEmbeddings(
  events: MemoryEvent[],
  k: number = 5
): Promise<Cluster[]> {
  if (events.length === 0) return [];

  // Generate embeddings for all events using unified utility
  const embeddings = await Promise.all(
    events.map(async (event) => {
      const embedding = await getEmbeddingForEvent(event);
      return embedding.vector;
    })
  );

  // Simple K-means implementation
  const dimensions = embeddings[0].length;
  const clusters: Cluster[] = [];

  // Initialize centroids randomly
  for (let i = 0; i < k; i++) {
    const centroid = Array(dimensions)
      .fill(0)
      .map(() => Math.random() * 2 - 1);

    clusters.push({
      id: `cluster-${i}`,
      center: centroid,
      points: [],
      label: `Cluster ${i + 1}`,
      color: getClusterColor(i),
      size: 0,
    });
  }

  // Iterate until convergence
  let iterations = 0;
  const maxIterations = 50;
  let changed = true;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    // Clear cluster points
    clusters.forEach((cluster) => {
      cluster.points = [];
    });

    // Assign points to nearest centroid
    events.forEach((event, index) => {
      const embedding = embeddings[index];
      let minDistance = Infinity;
      let nearestCluster = clusters[0];

      clusters.forEach((cluster) => {
        const distance = euclideanDistance(embedding, cluster.center);
        if (distance < minDistance) {
          minDistance = distance;
          nearestCluster = cluster;
        }
      });

      nearestCluster.points.push(event);
    });

    // Update centroids
    await Promise.all(
      clusters.map(async (cluster) => {
        if (cluster.points.length > 0) {
          const newCenter = Array(dimensions).fill(0);

          await Promise.all(
            cluster.points.map(async (point) => {
              const pointEmbedding = (await getEmbeddingForEvent(point)).vector;
              for (let i = 0; i < dimensions; i++) {
                newCenter[i] += pointEmbedding[i];
              }
            })
          );

          for (let i = 0; i < dimensions; i++) {
            newCenter[i] /= cluster.points.length;
          }

          // Check if centroid changed significantly
          const distance = euclideanDistance(cluster.center, newCenter);
          if (distance > 0.01) {
            changed = true;
          }

          cluster.center = newCenter;
          cluster.size = cluster.points.length;
        }
      })
    );
  }

  // Generate meaningful labels based on cluster content
  clusters.forEach((cluster) => {
    cluster.label = generateClusterLabel(cluster.points);
  });

  return clusters.filter((cluster) => cluster.points.length > 0);
}

// Semantic grouping based on facets and content
export function createSemanticGroups(events: MemoryEvent[]): SemanticGroup[] {
  const groups: SemanticGroup[] = [];

  // Group by source type
  const sourceGroups = events.reduce((acc, event) => {
    if (!acc[event.source]) {
      acc[event.source] = [];
    }
    acc[event.source].push(event);
    return acc;
  }, {} as Record<string, MemoryEvent[]>);

  // Create groups for each source
  Object.entries(sourceGroups).forEach(([source, events]) => {
    groups.push({
      id: `source-${source}`,
      name: `${source.charAt(0).toUpperCase() + source.slice(1)} Events`,
      description: `All ${source} perception events`,
      events,
      keywords: [source],
      color: source === "vision" ? "#00E0BE" : "#1BB4F2",
    });
  });

  // Group by time periods
  if (events.length > 0) {
    const sortedEvents = [...events].sort((a, b) => a.ts - b.ts);
    const timeRange =
      sortedEvents[sortedEvents.length - 1].ts - sortedEvents[0].ts;
    const timeGroups = 3; // Recent, Middle, Old

    for (let i = 0; i < timeGroups; i++) {
      const startTime = sortedEvents[0].ts + (timeRange * i) / timeGroups;
      const endTime = sortedEvents[0].ts + (timeRange * (i + 1)) / timeGroups;

      const timeGroupEvents = sortedEvents.filter(
        (event) => event.ts >= startTime && event.ts < endTime
      );

      if (timeGroupEvents.length > 0) {
        const timeLabel = i === 0 ? "Recent" : i === 1 ? "Middle" : "Old";
        groups.push({
          id: `time-${i}`,
          name: `${timeLabel} Events`,
          description: `Events from ${timeLabel.toLowerCase()} time period`,
          events: timeGroupEvents,
          keywords: [timeLabel.toLowerCase()],
          color: i === 0 ? "#FFB020" : i === 1 ? "#10B981" : "#6B7280",
        });
      }
    }
  }

  // Group by emotional valence
  const emotionalGroups = events.reduce((acc, event) => {
    const valence = Number(event.facets["affect.valence"]) || 0.5;
    let group = "neutral";

    if (valence < 0.3) group = "negative";
    else if (valence > 0.7) group = "positive";

    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(event);
    return acc;
  }, {} as Record<string, MemoryEvent[]>);

  Object.entries(emotionalGroups).forEach(([emotion, events]) => {
    if (events.length > 0) {
      groups.push({
        id: `emotion-${emotion}`,
        name: `${emotion.charAt(0).toUpperCase() + emotion.slice(1)} Sentiment`,
        description: `Events with ${emotion} emotional valence`,
        events,
        keywords: [emotion, "emotion", "sentiment"],
        color:
          emotion === "positive"
            ? "#10B981"
            : emotion === "negative"
            ? "#EF4444"
            : "#6B7280",
      });
    }
  });

  return groups;
}

// Helper functions
function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}

function getClusterColor(index: number): string {
  const colors = [
    "#00E0BE",
    "#1BB4F2",
    "#FFB020",
    "#EF4444",
    "#8B5CF6",
    "#F59E0B",
    "#10B981",
  ];
  return colors[index % colors.length];
}

function generateClusterLabel(events: MemoryEvent[]): string {
  if (events.length === 0) return "Empty Cluster";

  // Count source types
  const sourceCounts = events.reduce((acc, event) => {
    acc[event.source] = (acc[event.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Find most common source
  const mostCommonSource = Object.entries(sourceCounts).reduce((a, b) =>
    a[1] > b[1] ? a : b
  )[0];

  // Count common facets
  const facetCounts: Record<string, number> = {};
  events.forEach((event) => {
    Object.keys(event.facets).forEach((key) => {
      facetCounts[key] = (facetCounts[key] || 0) + 1;
    });
  });

  // Find most common facet
  const facetEntries = Object.entries(facetCounts);
  const mostCommonFacet =
    facetEntries.length > 0
      ? facetEntries.reduce((a, b) => (a[1] > b[1] ? a : b))
      : null;

  const facetKey = mostCommonFacet ? mostCommonFacet[0] : "unknown";
  return `${mostCommonSource} (${facetKey})`;
}

// Search and filter utilities
export function searchEvents(
  events: MemoryEvent[],
  query: string
): MemoryEvent[] {
  if (!query.trim()) return events;

  const searchLower = query.toLowerCase();
  return events.filter((event) => {
    // Search in source
    if (event.source.toLowerCase().includes(searchLower)) return true;

    // Search in facets
    return Object.values(event.facets).some((value) =>
      String(value).toLowerCase().includes(searchLower)
    );
  });
}

export function filterEventsBySource(
  events: MemoryEvent[],
  source: "all" | "vision" | "speech" | "stm" | "ltm"
): MemoryEvent[] {
  if (source === "all") return events;
  return events.filter((event) => event.source === source);
}

export function sortEventsByTime(
  events: MemoryEvent[],
  ascending: boolean = true
): MemoryEvent[] {
  return [...events].sort((a, b) => (ascending ? a.ts - b.ts : b.ts - a.ts));
}

export function sortEventsByConfidence(
  events: MemoryEvent[],
  ascending: boolean = true
): MemoryEvent[] {
  return [...events].sort((a, b) => {
    const aConfidence = Number(a.facets["confidence"]) || 0;
    const bConfidence = Number(b.facets["confidence"]) || 0;
    return ascending ? aConfidence - bConfidence : bConfidence - aConfidence;
  });
}

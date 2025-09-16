export interface Memory {
  id: string;
  timestamp: string; // ISO 8601 string for DateTime<Utc>
  modality: "vision" | "speech" | "text" | "concept";
  embedding: number[];
  facets: Record<string, any>;
  content?: string;
  tags?: string[];
}

export interface MemoryNote {
  modality: "vision" | "speech" | "text" | "concept";
  content: string;
  tags: string[];
  memoryId: string;
}

export interface ContextSummary {
  summary: string;
  memoryCount: number;
  timeWindow: number;
  focusVector?: number[];
}

export interface EgoThought {
  title: string;
  thought: string;
  metrics: {
    self_awareness: number;
    memory_consolidation_need: number;
    emotional_stability: number;
    creative_insight: number;
  };
  consolidate: string[];
  generatedAt: number;
  contextHash: string;
  model: string;
}

export interface ThoughtMetrics {
  grounding: number;
  consistency: number;
  specificity: number;
  overall: number;
}

export interface ReflectionConfig {
  timeWindowMinutes: number;
  maxMemories: number;
  maxNotes: number;
  maxContextWords: number;
  model: string;
  temperature: number;
  topP: number;
  repeatPenalty: number;
}

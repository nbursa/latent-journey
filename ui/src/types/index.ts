export interface Event {
  type: string;
  message?: string;
  clip_topk?: Array<{ label: string; score: number }>;
  transcript?: string;
  confidence?: number;
  language?: string;
  embedding_id?: string;
  ts?: number;
  facets?: Record<string, string | number>;
}

export interface MemoryEvent {
  ts: number;
  embedding_id: string;
  embedding: number[];
  facets: Record<string, string | number>;
  source: string; // "vision" or "speech"
}

export interface ServicesStatus {
  gateway: string;
  ml: string;
  sentience: string;
  llm: string;
  ego: string;
  embeddings: string;
}

export type MemoryFilter = "all" | "speech" | "vision";

export interface FacetDisplayProps {
  facets: Record<string, string | number>;
}

export interface AudioVisualizationRefs {
  audioContextRef: React.RefObject<AudioContext | null>;
  analyserRef: React.RefObject<AnalyserNode | null>;
  animationFrameRef: React.MutableRefObject<number | null>;
}

export interface MediaRefs {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  mediaRecorderRef: React.RefObject<MediaRecorder | null>;
  audioChunksRef: React.MutableRefObject<Blob[]>;
}

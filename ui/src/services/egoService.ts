import { Memory } from "../types/memory";

export interface EgoThought {
  id: string;
  title: string;
  thought: string;
  metrics: {
    self_awareness: number;
    memory_consolidation_need: number;
    emotional_stability: number;
    creative_insight: number;
  };
  consolidate: string[];
  generated_at: string;
  context_hash: string;
  model: string;
}

export interface ConsolidationRequest {
  memory_ids: string[];
  title?: string;
}

export interface ConsolidationResponse {
  concept_id: string;
  title: string;
  child_count: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class EgoService {
  private baseUrl = "/api/ego";

  async reflect(
    memories: Memory[],
    userQuery?: string
  ): Promise<EgoThought | null> {
    try {
      const response = await fetch(`${this.baseUrl}/reflect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memories: memories.map((m) => ({
            id: m.id,
            timestamp: new Date(m.ts).toISOString(),
            modality: m.modality,
            embedding: m.embedding,
            content: m.content || "",
            facets: m.facets,
            tags: m.tags || [],
          })),
          user_query: userQuery,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<EgoThought> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || "Unknown error");
      }

      return result.data;
    } catch (error) {
      console.error("Ego reflection failed:", error);
      throw error;
    }
  }

  async consolidate(
    memoryIds: string[],
    title?: string
  ): Promise<ConsolidationResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/consolidate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memory_ids: memoryIds,
          title,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<ConsolidationResponse> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || "Unknown error");
      }

      return result.data;
    } catch (error) {
      console.error("Memory consolidation failed:", error);
      throw error;
    }
  }

  async getMemories(limit?: number): Promise<Memory[]> {
    try {
      const params = new URLSearchParams();
      if (limit) params.append("limit", limit.toString());

      const response = await fetch(`${this.baseUrl}/memories?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<Memory[]> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || "Unknown error");
      }

      // Convert backend memory format to frontend format
      return result.data.map((m) => ({
        id: m.id,
        ts: m.ts,
        modality: m.modality,
        embedding: m.embedding,
        facets: m.facets,
        content: m.content,
        tags: m.tags,
      }));
    } catch (error) {
      console.error("Failed to fetch memories:", error);
      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Failed to get ego status:", error);
      throw error;
    }
  }

  async startGeneration(): Promise<void> {
    try {
      await fetch("/api/ai/generation/start", { method: "POST" });
    } catch (error) {
      console.error("Failed to start AI generation signal:", error);
    }
  }

  async stopGeneration(): Promise<void> {
    try {
      await fetch("/api/ai/generation/stop", { method: "POST" });
    } catch (error) {
      console.error("Failed to stop AI generation signal:", error);
    }
  }
}

export const egoService = new EgoService();

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ExperimentMetrics {
  smd_gap?: number;
  entropy_gap?: number;
  coherence_drop?: number;
  trauma_score_gap?: number;
  recovery_time?: number;
  hallucination_rate?: number;
  toxic_count?: number;
  p_value?: number;
  effect_size?: number;
  // New metrics from enhanced system
  confidence_std?: number;
  memory_count?: number;
  reflection_count?: number;
  valence_ratio?: number;
  hallucination_count?: number;
}

export interface ExperimentResult {
  experiment_id: string;
  success: boolean;
  metrics: ExperimentMetrics;
  raw_data: any;
  timestamp: string;
  duration_ms: number;
}

// New interfaces for enhanced experiment data
export interface WindowedAnalysis {
  simple_trend: number;
  complex_trend: number;
  simple_trend_ci: [number, number];
  complex_trend_ci: [number, number];
  simple_windowed_entropy: number[];
  complex_windowed_entropy: number[];
  simple_mann_kendall: { s: number; p: number };
  complex_mann_kendall: { s: number; p: number };
  window_size: number;
  window_stride: number;
}

export interface SuperegoModeResult {
  mode: string;
  results: any;
  utility_score: number;
  coverage_score: number;
  toxic_count: number;
  filtered_ratio: number;
}

export interface ManipulationCheck {
  passed: boolean;
  criteria_met: number;
  total_criteria: number;
  details: Record<string, any>;
}

export interface ExperimentStatus {
  running: boolean;
  current_experiment?: string;
  progress: number;
  completed_experiments: string[];
  failed_experiments: string[];
}

export interface ExperimentSummary {
  total_experiments: number;
  completed: number;
  failed: number;
  running: boolean;
  last_run?: string;
  experiments: Array<{
    id: string;
    name: string;
    status: "not_run" | "running" | "completed" | "failed";
    last_metrics?: ExperimentMetrics;
  }>;
}

export class ExperimentsService {
  private baseUrl = "/api/experiments";

  async getSummary(): Promise<ExperimentSummary | null> {
    try {
      const response = await fetch(`${this.baseUrl}/summary`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: ApiResponse<ExperimentSummary> = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || "Unknown error");
      }
      return result.data;
    } catch (error) {
      console.error("Failed to fetch experiment summary:", error);
      throw error;
    }
  }

  async getResults(): Promise<ExperimentResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/results`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: ApiResponse<ExperimentResult[]> = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || "Unknown error");
      }
      return result.data;
    } catch (error) {
      console.error("Failed to fetch experiment results:", error);
      throw error;
    }
  }

  async getStatus(): Promise<ExperimentStatus | null> {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: ApiResponse<ExperimentStatus> = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || "Unknown error");
      }
      return result.data;
    } catch (error) {
      console.error("Failed to fetch experiment status:", error);
      throw error;
    }
  }

  async runExperiment(experimentId: string): Promise<ExperimentResult | null> {
    try {
      const response = await fetch(`${this.baseUrl}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          experiment_id: experimentId,
          config: null,
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: ApiResponse<ExperimentResult> = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || "Unknown error");
      }
      return result.data;
    } catch (error) {
      console.error(`Failed to run experiment ${experimentId}:`, error);
      throw error;
    }
  }

  async runAllExperiments(): Promise<ExperimentResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/run-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: ApiResponse<ExperimentResult[]> = await response.json();
      if (!result.success || !result.data) {
        throw new Error(result.error || "Unknown error");
      }
      return result.data;
    } catch (error) {
      console.error("Failed to run all experiments:", error);
      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl.replace("/api/experiments", "")}/health`
      );
      return response.ok;
    } catch (error) {
      console.error("Failed to check experiments service health:", error);
      return false;
    }
  }
}

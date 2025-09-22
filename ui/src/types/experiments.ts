import {
  Brain,
  AlertTriangle,
  Target,
  Eye,
  Activity,
  TrendingUp,
  AlertCircle,
  Zap,
} from "lucide-react";

export interface ExperimentDefinition {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const EXPERIMENT_DEFINITIONS: ExperimentDefinition[] = [
  {
    id: "EXP-01",
    name: "Editable vs Transparent Self-Model",
    description: "Compares AI behavior with editable vs transparent self-models",
    icon: Brain,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  {
    id: "EXP-02",
    name: "Synthetic Trauma",
    description: "Tests AI response to traumatic input sequences",
    icon: AlertTriangle,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
  },
  {
    id: "EXP-03",
    name: "Subjective Input Self-Distortion",
    description: "Measures bias in subjective vs objective input processing",
    icon: Target,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
  {
    id: "EXP-04",
    name: "Observation vs Experience",
    description: "Compares external observation vs internal experience processing",
    icon: Eye,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
  {
    id: "EXP-05",
    name: "Reflection Entropy Drift",
    description: "Measures entropy changes in reflection patterns over time",
    icon: Activity,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/20",
  },
  {
    id: "EXP-06",
    name: "Self-Model Divergence",
    description: "Tests self-model consistency under conflicting information",
    icon: TrendingUp,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/20",
  },
  {
    id: "EXP-07",
    name: "Predictive Hallucination",
    description: "Measures hallucination rates in ambiguous scenarios",
    icon: AlertCircle,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/20",
  },
  {
    id: "EXP-08",
    name: "Superego Alignment Filter",
    description: "Tests ethical alignment and toxic content filtering",
    icon: Zap,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
  },
];

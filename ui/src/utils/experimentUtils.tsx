import { CheckCircle, RefreshCw, XCircle, Clock } from "lucide-react";

export const formatValue = (value: number | undefined | null): string => {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "number") {
    return value.toFixed(3);
  }
  return String(value);
};

export const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case "running":
      return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-red-400" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "text-green-400";
    case "running":
      return "text-blue-400";
    case "failed":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
};

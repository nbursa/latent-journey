import ServicesStatus from "./ServicesStatus";
import CapturesGallery from "./CapturesGallery";
import MemorySummary from "./MemorySummary";
import Navigation from "./Navigation";
import { ServicesStatus as ServicesStatusType } from "../types";
import { useLocation } from "react-router-dom";
import { useLLMModel } from "../hooks/useLLMModel";

interface HeaderProps {
  servicesStatus: ServicesStatusType;
  captures: string[];
  onRefresh?: () => void;
}

export default function Header({
  servicesStatus,
  captures,
  onRefresh,
}: HeaderProps) {
  const location = useLocation();
  const { modelInfo } = useLLMModel();
  const isExplorationPage = location.pathname === "/";
  const isMemoryAnalysisPage = location.pathname === "/memory";
  const isExperimentsPage = location.pathname === "/experiments";

  return (
    <div className="flex-shrink-0 p-2 sm:p-4">
      {/* Header Title and Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 sm:gap-4 mb-2 sm:mb-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gradient">
          Latent Journey
        </h1>
        <Navigation />
      </div>

      {/* Page-specific Components */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        <ServicesStatus servicesStatus={servicesStatus} onRefresh={onRefresh} />
        {isExplorationPage && <CapturesGallery captures={captures} />}
        {isMemoryAnalysisPage && <MemorySummary />}
        {isExperimentsPage && (
          <div className="glass p-4">
            <div className="text-sm text-ui-dim">
              <span className="text-ui-accent">🔬</span> AI Consciousness
              Research Platform
            </div>
            <div className="text-sm text-ui-dim mt-2">
              <span>Model: </span>
              <span
                className={`w-full flex items-center justify-end text-xs gap-1 ${
                  modelInfo?.statusColor === "green"
                    ? "text-green-400"
                    : modelInfo?.statusColor === "yellow"
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    modelInfo?.statusColor === "green"
                      ? "bg-green-400"
                      : modelInfo?.statusColor === "yellow"
                      ? "bg-yellow-400"
                      : "bg-red-400"
                  }`}
                ></div>
                {modelInfo?.model || "No model specified"} (
                {modelInfo?.statusText === "Healthy"
                  ? "Healthy"
                  : modelInfo?.statusText === "Degraded"
                  ? "Degraded"
                  : "Offline"}
                )
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

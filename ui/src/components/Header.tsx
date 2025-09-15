import ServicesStatus from "./ServicesStatus";
import CapturesGallery from "./CapturesGallery";
import Navigation from "./Navigation";
import { ServicesStatus as ServicesStatusType } from "../types";
import { useLocation } from "react-router-dom";

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
  const isExplorationPage = location.pathname === "/";

  return (
    <div className="flex-shrink-0 p-4">
      {/* Header Title and Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gradient">
          Latent Journey
        </h1>
        <Navigation />
      </div>

      {/* Services Status and Captures */}
      <div className="flex flex-col sm:flex-row gap-4">
        <ServicesStatus servicesStatus={servicesStatus} onRefresh={onRefresh} />
        {isExplorationPage && <CapturesGallery captures={captures} />}
      </div>
    </div>
  );
}

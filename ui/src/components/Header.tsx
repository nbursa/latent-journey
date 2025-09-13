import ServicesStatus from "./ServicesStatus";
import CapturesGallery from "./CapturesGallery";
import { ServicesStatus as ServicesStatusType } from "../types";
import { useLocation } from "react-router-dom";

interface HeaderProps {
  servicesStatus: ServicesStatusType;
  captures: string[];
}

export default function Header({ servicesStatus, captures }: HeaderProps) {
  const location = useLocation();
  const isExplorationPage = location.pathname === "/";

  return (
    <div className="flex-shrink-0 p-4">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-gradient text-glow">
        Latent Journey
      </h1>

      {/* Services Status and Captures */}
      <div className="flex flex-col sm:flex-row gap-4">
        <ServicesStatus servicesStatus={servicesStatus} />
        {isExplorationPage && <CapturesGallery captures={captures} />}
      </div>
    </div>
  );
}

import { ServicesStatus as ServicesStatusType } from "../types";
import { Server, Brain, Zap } from "lucide-react";

interface ServicesStatusProps {
  servicesStatus: ServicesStatusType;
}

export default function ServicesStatus({
  servicesStatus,
}: ServicesStatusProps) {
  const getStatusClass = (status: string) => {
    switch (status) {
      case "online":
        return "online";
      case "offline":
        return "offline";
      default:
        return "unknown";
    }
  };

  const services = [
    {
      key: "gateway" as keyof ServicesStatusType,
      label: "Gateway",
      icon: Server,
    },
    { key: "ml" as keyof ServicesStatusType, label: "ML Service", icon: Zap },
    {
      key: "sentience" as keyof ServicesStatusType,
      label: "Sentience",
      icon: Brain,
    },
  ];

  return (
    <div className="w-fit h-fit glass flat p-3 flex-shrink-0">
      <h3 className="text-sm font-semibold mb-2">Services Status</h3>
      <div className="flex flex-wrap gap-4">
        {services.map(({ key, label, icon: Icon }) => (
          <div key={key} className="flex items-center gap-2">
            <div
              className={`status-dot ${getStatusClass(servicesStatus[key])}`}
            />
            <Icon className="w-3 h-3" />
            <span className="text-xs">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

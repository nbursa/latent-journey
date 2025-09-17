import { ServicesStatus as ServicesStatusType } from "../types";
import { Server, Brain, Zap, MessageSquare, Cpu, Database } from "lucide-react";
import StatusBar from "./StatusBar";

interface ServicesStatusProps {
  servicesStatus: ServicesStatusType;
  onRefresh?: () => void;
}

export default function ServicesStatus({
  servicesStatus,
  onRefresh,
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
    {
      key: "llm" as keyof ServicesStatusType,
      label: "LLM Service",
      icon: MessageSquare,
    },
    {
      key: "ego" as keyof ServicesStatusType,
      label: "Ego Service",
      icon: Cpu,
    },
    {
      key: "embeddings" as keyof ServicesStatusType,
      label: "Embeddings",
      icon: Database,
    },
  ];

  return (
    <div className="w-fit h-fit glass flat p-3 flex-shrink-0">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Services Status</h3>
        {onRefresh && (
          <button onClick={onRefresh} className="text-xs px-2 py-1 btn-primary">
            Refresh
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-4 mb-3">
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
      <StatusBar />
    </div>
  );
}

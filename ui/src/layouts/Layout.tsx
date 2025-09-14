import { ReactNode, useEffect } from "react";
import { useMediaRecording } from "../hooks/useMediaRecording";
import { useAppStore } from "../stores/appStore";
import Header from "../components/Header";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const captures = useAppStore((state) => state.captures);
  const servicesStatus = useAppStore((state) => state.servicesStatus);
  const updateServicesStatus = useAppStore(
    (state) => state.updateServicesStatus
  );

  // Initialize media recording with store
  useMediaRecording();

  // Initialize service status checking globally
  useEffect(() => {
    const checkServices = async () => {
      const newStatus = {
        gateway: "unknown",
        ml: "unknown",
        sentience: "unknown",
      };

      try {
        // Check Gateway
        const gatewayResponse = await fetch("/ping");
        newStatus.gateway = gatewayResponse.ok ? "online" : "offline";
      } catch (error) {
        newStatus.gateway = "offline";
      }

      try {
        // Check ML Service
        const mlResponse = await fetch("/ml/ping");
        newStatus.ml = mlResponse.ok ? "online" : "offline";
      } catch (error) {
        newStatus.ml = "offline";
      }

      try {
        // Check Sentience Service
        const sentienceResponse = await fetch("/sentience/ping");
        newStatus.sentience = sentienceResponse.ok ? "online" : "offline";
      } catch (error) {
        newStatus.sentience = "offline";
      }

      // Update all services status in one go
      updateServicesStatus(newStatus);
    };

    // Check services immediately and then every 30 seconds
    checkServices();
    const statusInterval = setInterval(checkServices, 30000);

    return () => {
      clearInterval(statusInterval);
    };
  }, [updateServicesStatus]);

  return (
    <div className="h-screen w-screen flex flex-col text-white">
      <Header servicesStatus={servicesStatus} captures={captures} />

      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

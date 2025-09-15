import { ReactNode } from "react";
import { useMediaRecording } from "../hooks/useMediaRecording";
import { useAppStore } from "../stores/appStore";
import { useServicesStatus } from "../hooks/useServicesStatus";
import Header from "../components/Header";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const captures = useAppStore((state) => state.captures);
  const { servicesStatus, triggerStatusCheck } = useServicesStatus();

  // Initialize media recording with store
  useMediaRecording();

  return (
    <div className="h-screen w-screen flex flex-col text-white">
      <Header
        servicesStatus={servicesStatus}
        captures={captures}
        onRefresh={triggerStatusCheck}
      />

      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

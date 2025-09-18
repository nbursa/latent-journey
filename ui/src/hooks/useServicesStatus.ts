import { useAppStore } from "../stores/appStore";

export const useServicesStatus = () => {
  const servicesStatus = useAppStore((state) => state.servicesStatus);
  const updateServicesStatus = useAppStore(
    (state) => state.updateServicesStatus
  );

  const triggerStatusCheck = async () => {
    try {
      const response = await fetch("/api/status");
      if (response.ok) {
        const status = await response.json();
        updateServicesStatus(status);
      }
    } catch (error) {
      console.error("Failed to check services status:", error);
    }
  };

  return { servicesStatus, triggerStatusCheck };
};

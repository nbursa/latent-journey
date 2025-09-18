import { useAppStore } from "../stores/appStore";

export const useServicesStatus = () => {
  const servicesStatus = useAppStore((state) => state.servicesStatus);

  return { servicesStatus };
};

import { useState, useCallback } from "react";
import { ServicesStatus } from "../types";

export const useServicesStatus = () => {
  const [servicesStatus, setServicesStatus] = useState<ServicesStatus>({
    gateway: "unknown",
    ml: "unknown",
    sentience: "unknown",
  });

  const checkServices = useCallback(async () => {
    const newStatus: ServicesStatus = {
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
    setServicesStatus(newStatus);
  }, []);

  return { servicesStatus, checkServices };
};

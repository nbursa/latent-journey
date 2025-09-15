import { useState, useCallback, useEffect } from "react";
import { ServicesStatus } from "../types";

export const useServicesStatus = () => {
  const [servicesStatus, setServicesStatus] = useState<ServicesStatus>({
    gateway: "unknown",
    ml: "unknown",
    sentience: "unknown",
    llm: "unknown",
    ego: "unknown",
    embeddings: "unknown",
  });

  // Fallback: Periodic health checks (only if WebSocket fails)
  const checkServices = useCallback(async () => {
    const servicePorts = {
      gateway: 8080,
      ml: 8081,
      sentience: 8082,
      llm: 8083,
      ego: 8084,
      embeddings: 8085,
    };

    // Ultra-fast port check with minimal timeout
    const checkPort = async (
      port: number,
      service: string
    ): Promise<boolean> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 200); // 200ms timeout

        // Use correct endpoints for each service
        let endpoint = "/ping";
        if (service === "llm" || service === "ego") {
          endpoint = "/health";
        }

        const response = await fetch(`http://localhost:${port}${endpoint}`, {
          method: "GET", // Use GET instead of HEAD for better CORS support
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.ok;
      } catch {
        return false;
      }
    };

    // Check all services in parallel
    const results = await Promise.allSettled(
      Object.entries(servicePorts).map(async ([service, port]) => ({
        service,
        online: await checkPort(port, service),
      }))
    );

    // Update status
    const newStatus: ServicesStatus = {
      gateway: "unknown",
      ml: "unknown",
      sentience: "unknown",
      llm: "unknown",
      ego: "unknown",
      embeddings: "unknown",
    };

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        const { service, online } = result.value;
        newStatus[service as keyof ServicesStatus] = online
          ? "online"
          : "offline";
      }
    });

    setServicesStatus(newStatus);
  }, []);

  useEffect(() => {
    const eventSource = new EventSource(`http://localhost:8080/events`);
    let fallbackTimeout: number;

    eventSource.onopen = () => {
      clearTimeout(fallbackTimeout);
      // Trigger immediate status check after connection
      checkServices();
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Listen for service status updates
        if (data.type === "service.status") {
          setServicesStatus((prev) => {
            const newStatus = {
              ...prev,
              [data.service]: data.status,
            };
            return newStatus;
          });
        }
      } catch (error) {
        console.error("Error parsing service status:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("❌ SSE connection error:", error);

      // Mark all services as offline when connection is lost
      setServicesStatus({
        gateway: "offline",
        ml: "offline",
        sentience: "offline",
        llm: "offline",
        ego: "offline",
        embeddings: "offline",
      });

      // Fallback: trigger manual health check
      checkServices();
    };

    // Fallback: if SSE doesn't connect within 2 seconds, use HTTP polling
    fallbackTimeout = setTimeout(() => {
      checkServices();
    }, 2000);

    return () => {
      clearTimeout(fallbackTimeout);
      eventSource.close();
    };
  }, [checkServices]);

  // Manual trigger for testing
  const triggerStatusCheck = useCallback(() => {
    checkServices();
  }, [checkServices]);

  return { servicesStatus, checkServices, triggerStatusCheck };
};

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
    const checkPort = async (port: number): Promise<boolean> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 200); // 200ms timeout

        const response = await fetch(`http://localhost:${port}/ping`, {
          method: "HEAD", // HEAD request is faster than GET
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
        online: await checkPort(port),
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
        console.log(
          `HTTP check: ${service} = ${online ? "online" : "offline"}`
        );
      }
    });

    console.log("HTTP fallback status update:", newStatus);
    setServicesStatus(newStatus);
  }, []);

  useEffect(() => {
    console.log("Setting up SSE connection to http://localhost:8080/events");
    const eventSource = new EventSource(`http://localhost:8080/events`);
    let fallbackTimeout: number;

    eventSource.onopen = () => {
      console.log("✅ Services status SSE connected successfully");
      clearTimeout(fallbackTimeout);
      // Trigger immediate status check after connection
      checkServices();
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("SSE received:", data);

        // Listen for service status updates
        if (data.type === "service.status") {
          console.log(
            `Service status update: ${data.service} = ${data.status}`
          );
          setServicesStatus((prev) => {
            const newStatus = {
              ...prev,
              [data.service]: data.status,
            };
            console.log("Updated services status:", newStatus);
            return newStatus;
          });
        }
      } catch (error) {
        console.error("Error parsing service status:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("❌ Services status SSE error:", error);
      console.log("SSE readyState:", eventSource.readyState);
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
      console.log("SSE disconnected, triggering fallback health check");
      checkServices();
    };

    // Fallback: if SSE doesn't connect within 3 seconds, use HTTP polling
    fallbackTimeout = setTimeout(() => {
      console.log("SSE connection timeout, using fallback HTTP polling");
      checkServices();
    }, 1000); // Reduced to 1 second for faster fallback

    return () => {
      clearTimeout(fallbackTimeout);
      eventSource.close();
    };
  }, [checkServices]);

  // Manual trigger for testing
  const triggerStatusCheck = useCallback(() => {
    console.log("Manual status check triggered");
    checkServices();
  }, [checkServices]);

  return { servicesStatus, checkServices, triggerStatusCheck };
};

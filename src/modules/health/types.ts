export interface ComponentHealthStatus {
  status: "up" | "down" | "degraded";
  message?: string;
  details?: Record<string, unknown>;
}

export interface DetailedHealthCheckResult {
  status: "up" | "down" | "degraded";
  timestamp: string;
  uptime: number;
  environment: string;
  services: {
    mongodb: ComponentHealthStatus;
    redis: ComponentHealthStatus;
    bullmq: ComponentHealthStatus;
    aiProvider: ComponentHealthStatus;
    memory: ComponentHealthStatus;
  };
}

export interface RedisPingableClient {
  ping?: () => Promise<string>;
  status?: string;
}

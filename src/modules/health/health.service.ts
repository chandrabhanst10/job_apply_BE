import { checkDatabaseHealth } from "./core/index.js";
import { applyQueue } from "../../jobs/apply.queue.js";
import { env } from "../../config/env.js";
import type { ComponentHealthStatus, DetailedHealthCheckResult, RedisPingableClient } from "./types.js";

export class HealthService {
  async getDetailedHealth(): Promise<DetailedHealthCheckResult> {
    const [mongoStatus, redisStatus, bullmqStatus, aiStatus] = await Promise.all([
      checkDatabaseHealth(),
      this.checkRedisHealth(),
      this.checkBullMQHealth(),
      this.checkAIServiceHealth()
    ]);

    const memoryStatus = this.getMemoryHealth();
    const allServices = [mongoStatus, redisStatus, bullmqStatus, aiStatus, memoryStatus];
    const isDown = allServices.some((s) => s.status === "down");
    const isDegraded = allServices.some((s) => s.status === "degraded");

    const overallStatus: "up" | "down" | "degraded" = isDown ? "down" : isDegraded ? "degraded" : "up";

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      services: {
        mongodb: mongoStatus,
        redis: redisStatus,
        bullmq: bullmqStatus,
        aiProvider: aiStatus,
        memory: memoryStatus
      }
    };
  }

  private async checkRedisHealth(): Promise<ComponentHealthStatus> {
    try {
      const client = (await applyQueue.client) as unknown as RedisPingableClient;
      if (typeof client.ping === "function") {
        const pingResponse = await client.ping();
        if (pingResponse === "PONG") {
          return { status: "up", message: "Redis responding to ping." };
        }
        return { status: "degraded", message: `Redis ping response: ${pingResponse}` };
      }
      return { status: "up", message: `Redis client status: ${client.status || "ready"}` };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return { status: "degraded", message: `Redis connection notice: ${errMsg}` };
    }
  }

  private async checkBullMQHealth(): Promise<ComponentHealthStatus> {
    try {
      const waitingCount = await applyQueue.getWaitingCount();
      const activeCount = await applyQueue.getActiveCount();
      const failedCount = await applyQueue.getFailedCount();

      return {
        status: "up",
        message: "BullMQ job-applications queue active",
        details: { waitingJobs: waitingCount, activeJobs: activeCount, failedJobs: failedCount }
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return { status: "degraded", message: `BullMQ status notice: ${errMsg}` };
    }
  }

  private checkAIServiceHealth(): ComponentHealthStatus {
    if (env.GEMINI_API_KEY) {
      return {
        status: "up",
        message: "Gemini AI API Key configured.",
        details: { model: env.GEMINI_MODEL }
      };
    }
    return {
      status: "degraded",
      message: "No GEMINI_API_KEY set. Application operating with local AI fallbacks."
    };
  }

  private getMemoryHealth(): ComponentHealthStatus {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memoryUsage.rss / 1024 / 1024);

    const isHighMemory = heapUsedMB > 1024; // > 1GB

    return {
      status: isHighMemory ? "degraded" : "up",
      message: `Memory RSS: ${rssMB}MB, Heap: ${heapUsedMB}MB / ${heapTotalMB}MB`,
      details: { heapUsedMB, heapTotalMB, rssMB }
    };
  }
}

export const healthService = new HealthService();

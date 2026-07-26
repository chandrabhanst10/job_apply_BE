import { Queue } from "bullmq";
import { env } from "../config/env.js";

const connection = {
  url: env.REDIS_URL || "redis://localhost:6379"
};

export interface ApplyJobData {
  userId: string;
  applicationId: string;
  platform: "linkedin" | "naukri";
  jobUrl: string;
  resumeId: string;
}

export const applyQueue = new Queue<ApplyJobData>("job-applications", {
  connection
});

let lastErrorLoggedAt = 0;
applyQueue.on("error", (err) => {
  const now = Date.now();
  if (now - lastErrorLoggedAt > 30000) {
    console.warn(`[Queue Warning] Redis connection issue: ${err.message}. Retrying...`);
    lastErrorLoggedAt = now;
  }
});

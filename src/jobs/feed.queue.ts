import { Queue } from "bullmq";
import { env } from "../config/env.js";

export interface FeedJobData {
  userId: string;
  feedOpportunityId: string;
  applicationMethod: "official_link" | "company_careers" | "recruiter_email" | "manual_review";
  applicationUrl?: string;
  applicationEmail?: string;
  jobTitle: string;
  company?: string;
}

export const feedQueue = new Queue<FeedJobData>("feed-applications", {
  connection: { url: env.REDIS_URL || "redis://localhost:6379" }
});

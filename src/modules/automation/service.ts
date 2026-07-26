import {
  listJobApplicationsByUser,
  countJobApplicationStats,
  findQueuedJobApplications,
  updateJobApplicationStatus
} from "./core/index.js";
import {
  listFeedOpportunitiesByUserId,
  findQueuedFeedOpportunities,
  updateFeedOpportunityStatus
} from "../feed-scanner/core/index.js";
import { runAutopilotCrawl } from "../../jobs/scrape.worker.js";
import { runFeedScannerCrawl } from "../../jobs/feed-scanner.worker.js";
import { auditService } from "../audit/service.js";
import { notificationService } from "../notification/service.js";
import type { TriggerCrawlContext } from "./types.js";

export class AutomationService {
  async getHistory(userId: string, limit = 50, skip = 0) {
    const [officialApps, feedOpps] = await Promise.all([
      listJobApplicationsByUser(userId, limit, skip),
      listFeedOpportunitiesByUserId(userId, {}, limit, skip)
    ]);

    const formattedFeedOpps = feedOpps.map(f => ({
      _id: f._id.toString(),
      platform: f.platform || "linkedin",
      jobUrl: f.applicationUrl || f.companyWebsite || "https://linkedin.com",
      jobTitle: f.jobTitle,
      company: f.company,
      matchScore: f.matchScore,
      status: f.status === "discovered" || f.status === "matched" ? "scanned" : f.status,
      error: f.error || undefined,
      createdAt: f.createdAt ? f.createdAt.toISOString() : new Date().toISOString(),
      appliedAt: f.appliedAt ? f.appliedAt.toISOString() : undefined
    }));

    const combined = [...officialApps, ...formattedFeedOpps].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return { data: combined, limit, skip };
  }

  async getStats(userId: string) {
    return countJobApplicationStats(userId);
  }

  async triggerCrawl(userId: string, context: TriggerCrawlContext) {
    runAutopilotCrawl().catch((err) => {
      console.error("[Automation] Manual crawl trigger failed:", err);
    });

    runFeedScannerCrawl().catch((err) => {
      console.error("[Automation] Manual feed scan trigger failed:", err);
    });

    this.processQueuedApplications(userId).catch((err) => {
      console.error("[Automation] Processing queued applications error:", err);
    });

    await auditService.record({
      userId,
      action: "automation.trigger_crawl",
      resource: "user",
      resourceId: userId,
      ...context
    });

    return { message: "Autopilot crawl triggered and background scan started." };
  }

  async processQueuedApplications(userId: string) {
    const queuedOfficialApps = await findQueuedJobApplications(userId, 10);

    for (const app of queuedOfficialApps) {
      await updateJobApplicationStatus(app._id.toString(), "applied", undefined, new Date());
      notificationService.send(userId, "job_application_status", {
        applicationId: app._id.toString(),
        status: "applied",
        platform: app.platform,
        jobUrl: app.jobUrl
      });
    }

    const queuedFeedOpps = await findQueuedFeedOpportunities(userId, 10);

    for (const opp of queuedFeedOpps) {
      await updateFeedOpportunityStatus(opp._id.toString(), "applied");
      notificationService.send(userId, "feed_opportunity_discovered", {
        opportunityId: opp._id.toString(),
        jobTitle: opp.jobTitle,
        company: opp.company,
        matchScore: opp.matchScore,
        status: "applied"
      });
    }
  }
}

export const automationService = new AutomationService();

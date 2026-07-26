import { NotFoundError, BadRequestError } from "../../utils/app-error.js";
import { runFeedScannerCrawl } from "../../jobs/feed-scanner.worker.js";
import { applyQueue } from "../../jobs/apply.queue.js";
import { auditService } from "../audit/service.js";
import { findUserById, updateUserAutopilot } from "../user/core/index.js";
import { findLatestResumeByUser } from "../resume/index.js";
import {
  listFeedPostsByUserId,
  countFeedPostsByUserId,
  listFeedOpportunitiesByUserId,
  countFeedOpportunitiesByUserId,
  findFeedOpportunityById,
  updateFeedOpportunityStatus
} from "./core/index.js";

export class FeedScannerService {
  async getPosts(userId: string, limit = 50, skip = 0) {
    const data = await listFeedPostsByUserId(userId, limit, skip);
    const total = await countFeedPostsByUserId(userId);
    return { data, total, limit, skip };
  }

  async getOpportunities(
    userId: string,
    filter: { status?: string; minScore?: number } = {},
    limit = 50,
    skip = 0
  ) {
    const data = await listFeedOpportunitiesByUserId(userId, filter, limit, skip);
    const total = await countFeedOpportunitiesByUserId(userId, { status: filter.status });
    return { data, total, limit, skip };
  }

  async triggerScan(userId: string, context: { ip?: string; userAgent?: string }) {
    const user = await findUserById(userId);
    if (!user) throw new NotFoundError("User not found");

    if (!user.connections?.linkedin?.isConnected) {
      throw new BadRequestError("LinkedIn account must be connected to scan social feed.");
    }

    runFeedScannerCrawl().catch((err) => {
      console.error("[Feed Scanner] Manual trigger error:", err);
    });

    await auditService.record({
      userId,
      action: "feed_scanner.manual_trigger",
      resource: "user",
      resourceId: userId,
      ...context
    });

    return { message: "Feed scan process initiated in background." };
  }

  async applyToOpportunity(
    userId: string,
    opportunityId: string,
    context: { ip?: string; userAgent?: string }
  ) {
    const opp = await findFeedOpportunityById(opportunityId);
    if (!opp || opp.userId.toString() !== userId) {
      throw new NotFoundError("Feed opportunity not found");
    }

    if (!opp.applicationUrl) {
      throw new BadRequestError("Opportunity does not contain a direct application URL.");
    }

    const primaryResume = await findLatestResumeByUser(userId);
    if (!primaryResume) {
      throw new BadRequestError("No resume uploaded to perform application.");
    }

    await updateFeedOpportunityStatus(opportunityId, "applied");

    await applyQueue.add(`feed-apply-${opp._id}`, {
      userId,
      applicationId: opp._id.toString(),
      platform: "linkedin",
      jobUrl: opp.applicationUrl,
      resumeId: primaryResume._id.toString()
    });

    await auditService.record({
      userId,
      action: "feed_scanner.manual_apply",
      resource: "feed_opportunity",
      resourceId: opportunityId,
      ...context
    });

    return { message: "Application queued successfully.", opportunityId };
  }

  async updateSettings(
    userId: string,
    input: { feedScanEnabled?: boolean; minMatchScore?: number }
  ) {
    const user = await findUserById(userId);
    if (!user) throw new NotFoundError("User not found");

    const updated = await updateUserAutopilot(userId, "linkedin", {
      feedScanEnabled: input.feedScanEnabled,
      minMatchScore: input.minMatchScore
    });

    return {
      feedScanEnabled: updated?.autopilot?.linkedin?.feedScanEnabled ?? false,
      minMatchScore: updated?.autopilot?.linkedin?.minMatchScore ?? 60
    };
  }
}

export const feedScannerService = new FeedScannerService();

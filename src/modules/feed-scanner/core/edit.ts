import { FeedPostModel, type FeedPostDocument } from "../post.model.js";
import { FeedOpportunityModel, type FeedOpportunityDocument } from "../opportunity.model.js";

export function updateFeedPostHiringStatus(id: string, isHiring: boolean): Promise<FeedPostDocument | null> {
  return FeedPostModel.findByIdAndUpdate(
    id,
    { $set: { isHiring, processedAt: new Date() } },
    { new: true }
  ).exec();
}

export function updateFeedOpportunityStatus(
  id: string,
  status: "discovered" | "matched" | "queued" | "applying" | "applied" | "failed" | "manual_review" | "ignored",
  error?: string,
  appliedAt?: Date
): Promise<FeedOpportunityDocument | null> {
  const update: Record<string, unknown> = { status };
  if (error !== undefined) update.error = error;
  if (appliedAt !== undefined) update.appliedAt = appliedAt;
  return FeedOpportunityModel.findByIdAndUpdate(id, { $set: update }, { new: true }).exec();
}

export function updateFeedOpportunityMatchResults(
  id: string,
  matchScore: number,
  matchingSkills: string[],
  missingSkills: string[],
  recommendation: string,
  status: "discovered" | "matched" | "queued" | "applying" | "applied" | "failed" | "manual_review" | "ignored"
): Promise<FeedOpportunityDocument | null> {
  return FeedOpportunityModel.findByIdAndUpdate(
    id,
    { $set: { matchScore, matchingSkills, missingSkills, recommendation, status } },
    { new: true }
  ).exec();
}

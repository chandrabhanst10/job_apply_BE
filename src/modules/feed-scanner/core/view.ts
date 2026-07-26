import { FeedPostModel, type FeedPostDocument } from "../post.model.js";
import { FeedOpportunityModel, type FeedOpportunityDocument } from "../opportunity.model.js";
import type { FeedOpportunityFilter } from "../types.js";

export function findFeedPostByPostId(userId: string, postId: string): Promise<FeedPostDocument | null> {
  return FeedPostModel.findOne({ userId, postId }).exec();
}

export function listFeedPostsByUserId(userId: string, limit = 50, skip = 0): Promise<FeedPostDocument[]> {
  return FeedPostModel.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
}

export function countFeedPostsByUserId(userId: string): Promise<number> {
  return FeedPostModel.countDocuments({ userId }).exec();
}

export function findFeedOpportunityByDedupHash(userId: string, dedupHash: string): Promise<FeedOpportunityDocument | null> {
  return FeedOpportunityModel.findOne({ userId, dedupHash }).exec();
}

export function findFeedOpportunityById(id: string): Promise<FeedOpportunityDocument | null> {
  return FeedOpportunityModel.findById(id).exec();
}

export function listFeedOpportunitiesByUserId(
  userId: string,
  filter: FeedOpportunityFilter = {},
  limit = 50,
  skip = 0
): Promise<FeedOpportunityDocument[]> {
  const query: Record<string, unknown> = { userId };
  if (filter.status) query.status = filter.status;
  if (filter.minScore !== undefined) query.matchScore = { $gte: filter.minScore };

  return FeedOpportunityModel.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .exec();
}

export function countFeedOpportunitiesByUserId(userId: string, filter: { status?: string } = {}): Promise<number> {
  const query: Record<string, unknown> = { userId };
  if (filter.status) query.status = filter.status;
  return FeedOpportunityModel.countDocuments(query).exec();
}

export function findQueuedFeedOpportunities(userId: string, limit = 10): Promise<FeedOpportunityDocument[]> {
  return FeedOpportunityModel.find({
    userId,
    status: { $in: ["queued", "pending"] }
  }).limit(limit).exec();
}

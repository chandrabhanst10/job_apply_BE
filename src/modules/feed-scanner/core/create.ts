import { FeedPostModel, type FeedPostDocument } from "../post.model.js";
import { FeedOpportunityModel, type FeedOpportunityDocument } from "../opportunity.model.js";
import type { Types } from "mongoose";

export interface CreateFeedPostInput {
  userId: Types.ObjectId | string;
  platform: "linkedin" | "naukri";
  postId: string;
  postUrl: string;
  authorName?: string;
  authorUrl?: string;
  postText: string;
  rawContent?: Record<string, unknown>;
  isHiring?: boolean;
  processedAt?: Date;
}

export interface CreateFeedOpportunityInput {
  userId: Types.ObjectId | string;
  feedPostId: Types.ObjectId | string;
  platform?: "linkedin" | "naukri";
  jobTitle: string;
  company?: string;
  recruiter?: { name?: string; profileUrl?: string };
  experience?: string;
  skills?: string[];
  location?: string;
  employmentType?: string;
  salary?: string;
  applicationUrl?: string;
  applicationEmail?: string;
  companyWebsite?: string;
  deadline?: Date;
  workplaceType?: "remote" | "hybrid" | "onsite" | "unspecified";
  dedupHash: string;
  matchScore?: number;
  matchingSkills?: string[];
  missingSkills?: string[];
  recommendation?: string;
  applicationMethod?: "official_link" | "company_careers" | "recruiter_email" | "manual_review";
  status?: "discovered" | "matched" | "queued" | "applying" | "applied" | "failed" | "manual_review" | "ignored";
}

export async function createFeedPost(input: CreateFeedPostInput): Promise<FeedPostDocument> {
  return FeedPostModel.create(input);
}

export async function createFeedOpportunity(input: CreateFeedOpportunityInput): Promise<FeedOpportunityDocument> {
  return FeedOpportunityModel.create(input);
}

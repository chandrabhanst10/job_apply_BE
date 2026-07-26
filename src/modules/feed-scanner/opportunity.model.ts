import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const recruiterSchema = new Schema(
  {
    name: { type: String, trim: true },
    profileUrl: { type: String, trim: true }
  },
  { _id: false }
);

const feedOpportunitySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    feedPostId: { type: Schema.Types.ObjectId, ref: "FeedPost", required: true, index: true },
    platform: { type: String, enum: ["linkedin", "naukri"], required: true, default: "linkedin" },
    jobTitle: { type: String, required: true, trim: true },
    company: { type: String, trim: true },
    recruiter: { type: recruiterSchema },
    experience: { type: String, trim: true },
    skills: [{ type: String, trim: true }],
    location: { type: String, trim: true },
    employmentType: { type: String, trim: true },
    salary: { type: String, trim: true },
    applicationUrl: { type: String, trim: true },
    applicationEmail: { type: String, trim: true },
    companyWebsite: { type: String, trim: true },
    deadline: { type: Date },
    workplaceType: { type: String, enum: ["remote", "hybrid", "onsite", "unspecified"], default: "unspecified" },
    dedupHash: { type: String, required: true, index: true },
    matchScore: { type: Number, min: 0, max: 100, default: 0 },
    matchingSkills: [{ type: String, trim: true }],
    missingSkills: [{ type: String, trim: true }],
    recommendation: { type: String },
    applicationMethod: {
      type: String,
      enum: ["official_link", "company_careers", "recruiter_email", "manual_review"],
      required: true,
      default: "manual_review"
    },
    status: {
      type: String,
      enum: ["discovered", "matched", "queued", "applying", "applied", "failed", "manual_review", "ignored"],
      default: "discovered",
      index: true
    },
    error: { type: String, default: null },
    appliedAt: { type: Date, default: null }
  },
  { timestamps: true, versionKey: false }
);

feedOpportunitySchema.index({ userId: 1, dedupHash: 1 }, { unique: true });
feedOpportunitySchema.index({ userId: 1, status: 1, createdAt: -1 });

export type FeedOpportunityDocument = InferSchemaType<typeof feedOpportunitySchema> & { _id: mongoose.Types.ObjectId };
export const FeedOpportunityModel: Model<FeedOpportunityDocument> =
  mongoose.models.FeedOpportunity || mongoose.model<FeedOpportunityDocument>("FeedOpportunity", feedOpportunitySchema);

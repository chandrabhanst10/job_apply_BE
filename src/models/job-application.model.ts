import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const jobApplicationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    platform: { type: String, enum: ["linkedin", "naukri"], required: true },
    jobUrl: { type: String, required: true },
    jobTitle: { type: String, trim: true },
    company: { type: String, trim: true },
    status: { type: String, enum: ["pending", "applying", "applied", "failed"], default: "pending", index: true },
    error: { type: String, default: null },
    appliedAt: { type: Date, default: null }
  },
  { timestamps: true, versionKey: false }
);

jobApplicationSchema.index({ userId: 1, createdAt: -1 });

export type JobApplicationDocument = InferSchemaType<typeof jobApplicationSchema> & { _id: mongoose.Types.ObjectId };
export const JobApplicationModel: Model<JobApplicationDocument> =
  mongoose.models.JobApplication || mongoose.model<JobApplicationDocument>("JobApplication", jobApplicationSchema);

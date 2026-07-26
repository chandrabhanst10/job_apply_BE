import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const resumeAnalysisSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume", required: true, unique: true, index: true },
    skills: [{ type: String, trim: true }],
    experience: [{ type: String, trim: true }],
    education: [{ type: String, trim: true }],
    projects: [{ type: String, trim: true }],
    certifications: [{ type: String, trim: true }],
    atsScore: { type: Number, required: true, min: 0, max: 100 },
    summary: { type: String, required: true },
    missingSkills: [{ type: String, trim: true }],
    suggestions: [{ type: String, trim: true }],
    provider: { type: String, enum: ["gemini", "local"], required: true },
    rawProviderResponse: { type: Schema.Types.Mixed }
  },
  { timestamps: true, versionKey: false }
);

export type ResumeAnalysisDocument = InferSchemaType<typeof resumeAnalysisSchema> & { _id: mongoose.Types.ObjectId };
export const ResumeAnalysisModel: Model<ResumeAnalysisDocument> =
  mongoose.models.ResumeAnalysis || mongoose.model<ResumeAnalysisDocument>("ResumeAnalysis", resumeAnalysisSchema);

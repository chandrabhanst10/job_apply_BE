import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const resumeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    originalName: { type: String, required: true, trim: true },
    storedName: { type: String, required: true },
    path: { type: String, required: true },
    mimeType: { type: String, enum: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"], required: true },
    extension: { type: String, enum: [".pdf", ".docx"], required: true },
    size: { type: Number, required: true, min: 1 },
    checksum: { type: String, required: true, index: true },
    status: { type: String, enum: ["uploaded", "analyzed", "analysis_failed"], default: "uploaded", index: true },
    deletedAt: { type: Date, index: true }
  },
  { timestamps: true, versionKey: false }
);

resumeSchema.index({ userId: 1, createdAt: -1 });

export type ResumeDocument = InferSchemaType<typeof resumeSchema> & { _id: mongoose.Types.ObjectId };
export const ResumeModel: Model<ResumeDocument> =
  mongoose.models.Resume || mongoose.model<ResumeDocument>("Resume", resumeSchema);

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export type DataRequestType = "export" | "delete_account" | "delete_resumes" | "delete_ai_history" | "delete_documents";
export type DataRequestStatus = "pending" | "processing" | "completed" | "failed";

const dataRequestSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["export", "delete_account", "delete_resumes", "delete_ai_history", "delete_documents"],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true
    },
    requestedAt: { type: Date, default: Date.now, index: true },
    completedAt: { type: Date, default: null },
    ipAddress: { type: String, default: null },
    details: { type: Schema.Types.Mixed, default: null }
  },
  { timestamps: true, versionKey: false }
);

dataRequestSchema.index({ userId: 1, createdAt: -1 });

export type DataRequestDocument = InferSchemaType<typeof dataRequestSchema> & { _id: mongoose.Types.ObjectId };
export const DataRequestModel: Model<DataRequestDocument> =
  mongoose.models.DataRequest || mongoose.model<DataRequestDocument>("DataRequest", dataRequestSchema);

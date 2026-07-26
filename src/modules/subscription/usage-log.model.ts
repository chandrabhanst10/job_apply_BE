import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const usageLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
    applicationsSubmitted: { type: Number, default: 0 },
    feedScansExecuted: { type: Number, default: 0 },
    promptTestsRun: { type: Number, default: 0 },
    aiTokensEstimated: { type: Number, default: 0 }
  },
  { timestamps: true }
);

usageLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export type IUsageLog = InferSchemaType<typeof usageLogSchema>;
export const UsageLogModel: Model<IUsageLog> =
  mongoose.models.UsageLog || mongoose.model<IUsageLog>("UsageLog", usageLogSchema);

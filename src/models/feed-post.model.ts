import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const feedPostSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    platform: { type: String, enum: ["linkedin", "naukri"], required: true, default: "linkedin" },
    postId: { type: String, required: true, index: true },
    postUrl: { type: String, required: true },
    authorName: { type: String, trim: true },
    authorUrl: { type: String, trim: true },
    postText: { type: String, required: true },
    rawContent: { type: Schema.Types.Mixed },
    isHiring: { type: Boolean, default: false, index: true },
    processedAt: { type: Date, default: null }
  },
  { timestamps: true, versionKey: false }
);

feedPostSchema.index({ userId: 1, postId: 1 }, { unique: true });
feedPostSchema.index({ userId: 1, createdAt: -1 });

export type FeedPostDocument = InferSchemaType<typeof feedPostSchema> & { _id: mongoose.Types.ObjectId };
export const FeedPostModel: Model<FeedPostDocument> =
  mongoose.models.FeedPost || mongoose.model<FeedPostDocument>("FeedPost", feedPostSchema);

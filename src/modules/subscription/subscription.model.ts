import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const subscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    plan: {
      type: String,
      enum: ["free", "pro", "business", "enterprise"],
      default: "free"
    },
    status: {
      type: String,
      enum: ["active", "trialing", "past_due", "canceled"],
      default: "active"
    },
    limits: {
      maxDailyApplications: { type: Number, default: 10 },
      maxDailyFeedScans: { type: Number, default: 5 },
      maxDailyPromptTests: { type: Number, default: 20 },
      maxResumes: { type: Number, default: 3 }
    },
    stripeCustomerId: { type: String, trim: true },
    stripeSubscriptionId: { type: String, trim: true },
    currentPeriodEnd: { type: Date }
  },
  { timestamps: true }
);

export type ISubscription = InferSchemaType<typeof subscriptionSchema>;
export const SubscriptionModel: Model<ISubscription> =
  mongoose.models.Subscription || mongoose.model<ISubscription>("Subscription", subscriptionSchema);

import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const apiKeySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true },
    prefix: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true },
    scopes: { type: [String], default: ["read", "write"] },
    lastUsedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    isRevoked: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export type IApiKey = InferSchemaType<typeof apiKeySchema>;
export const ApiKeyModel: Model<IApiKey> =
  mongoose.models.ApiKey || mongoose.model<IApiKey>("ApiKey", apiKeySchema);

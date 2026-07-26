import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    replacedByTokenHash: { type: String },
    expiresAt: { type: Date, required: true, expires: 0 },
    revokedAt: { type: Date },
    createdByIp: { type: String },
    revokedByIp: { type: String },
    userAgent: { type: String }
  },
  { timestamps: true, versionKey: false }
);

refreshTokenSchema.index({ userId: 1, familyId: 1 });

export type RefreshTokenDocument = InferSchemaType<typeof refreshTokenSchema> & { _id: mongoose.Types.ObjectId };
export const RefreshTokenModel: Model<RefreshTokenDocument> =
  mongoose.models.RefreshToken || mongoose.model<RefreshTokenDocument>("RefreshToken", refreshTokenSchema);

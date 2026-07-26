import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const pairingPinSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    pin: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    isUsed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export type IPairingPin = InferSchemaType<typeof pairingPinSchema>;
export const PairingPinModel: Model<IPairingPin> =
  mongoose.models.PairingPin || mongoose.model<IPairingPin>("PairingPin", pairingPinSchema);

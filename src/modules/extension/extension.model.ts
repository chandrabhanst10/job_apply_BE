import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const extensionPairingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    extensionVersion: { type: String, required: true, default: "1.0.0" },
    browserName: { type: String, default: "Chrome" },
    pairedAt: { type: Date, default: Date.now },
    lastHeartbeatAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["active", "disconnected"], default: "active" }
  },
  { timestamps: true }
);

export type IExtensionPairing = InferSchemaType<typeof extensionPairingSchema>;
export const ExtensionPairingModel: Model<IExtensionPairing> =
  mongoose.models.ExtensionPairing || mongoose.model<IExtensionPairing>("ExtensionPairing", extensionPairingSchema);

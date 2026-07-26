import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const userPromptOverrideSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    promptKey: { type: String, required: true, trim: true, index: true },
    customPrompt: { type: String, required: true },
    isCustomized: { type: Boolean, default: true, index: true }
  },
  { timestamps: true, versionKey: false }
);

userPromptOverrideSchema.index({ userId: 1, promptKey: 1 }, { unique: true });

export type UserPromptOverrideDocument = InferSchemaType<typeof userPromptOverrideSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const UserPromptOverrideModel: Model<UserPromptOverrideDocument> =
  mongoose.models.UserPromptOverride || mongoose.model<UserPromptOverrideDocument>("UserPromptOverride", userPromptOverrideSchema);

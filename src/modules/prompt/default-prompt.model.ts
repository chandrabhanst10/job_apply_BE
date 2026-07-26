import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const defaultPromptSchema = new Schema(
  {
    promptKey: { type: String, required: true, unique: true, index: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    defaultPrompt: { type: String, required: true },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true, versionKey: false }
);

export type DefaultPromptDocument = InferSchemaType<typeof defaultPromptSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const DefaultPromptModel: Model<DefaultPromptDocument> =
  mongoose.models.DefaultPrompt || mongoose.model<DefaultPromptDocument>("DefaultPrompt", defaultPromptSchema);

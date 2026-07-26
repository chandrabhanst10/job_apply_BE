import { DefaultPromptModel, type DefaultPromptDocument } from "../default-prompt.model.js";
import { UserPromptOverrideModel, type UserPromptOverrideDocument } from "../user-prompt-override.model.js";
import type { DefaultPromptItemInput } from "../types.js";

export async function upsertInitialDefaultPrompts(prompts: DefaultPromptItemInput[]): Promise<void> {
  for (const item of prompts) {
    await DefaultPromptModel.updateOne(
      { promptKey: item.promptKey },
      { $setOnInsert: item },
      { upsert: true }
    ).exec();
  }
}

export async function findUserPromptOverride(userId: string, promptKey: string): Promise<UserPromptOverrideDocument | null> {
  return UserPromptOverrideModel.findOne({ userId, promptKey, isCustomized: true }).exec();
}

export async function findDefaultPrompt(promptKey: string): Promise<DefaultPromptDocument | null> {
  return DefaultPromptModel.findOne({ promptKey, isActive: true }).exec();
}

export async function findAllActiveDefaultPrompts(): Promise<DefaultPromptDocument[]> {
  return DefaultPromptModel.find({ isActive: true }).sort({ category: 1, name: 1 }).exec();
}

export async function findAllUserPromptOverrides(userId: string): Promise<UserPromptOverrideDocument[]> {
  return UserPromptOverrideModel.find({ userId, isCustomized: true }).exec();
}

export async function updateUserPromptOverride(
  userId: string,
  promptKey: string,
  customPrompt: string
): Promise<UserPromptOverrideDocument | null> {
  return UserPromptOverrideModel.findOneAndUpdate(
    { userId, promptKey },
    { $set: { customPrompt, isCustomized: true } },
    { upsert: true, new: true, runValidators: true }
  ).exec();
}

export async function deleteUserPromptOverride(userId: string, promptKey: string): Promise<void> {
  await UserPromptOverrideModel.deleteOne({ userId, promptKey }).exec();
}

import { UserModel, type UserDocument } from "../model.js";

export function updateUserProfile(id: string, profile: Record<string, unknown>): Promise<UserDocument | null> {
  return UserModel.findOneAndUpdate({ _id: id, isDeleted: false }, { $set: profile }, { new: true, runValidators: true }).exec();
}

export function updateUserConnection(
  id: string,
  platform: "linkedin" | "naukri",
  data: {
    isConnected?: boolean;
    cookies?: string | null;
    username?: string | null;
    lastSyncAt?: Date | null;
  }
): Promise<UserDocument | null> {
  const updateObj: Record<string, boolean | string | Date | null> = {};
  for (const [key, value] of Object.entries(data)) {
    updateObj[`connections.${platform}.${key}`] = value as boolean | string | Date | null;
  }
  return UserModel.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: updateObj },
    { new: true, runValidators: true }
  ).exec();
}

export function updateUserAutopilot(
  id: string,
  platform: "linkedin" | "naukri",
  data: {
    enabled?: boolean;
    feedScanEnabled?: boolean;
    minMatchScore?: number;
    jobTitles?: string[];
    locations?: string[];
    lastRunAt?: Date | null;
  }
): Promise<UserDocument | null> {
  const updateObj: Record<string, boolean | number | string[] | Date | null> = {};
  for (const [key, value] of Object.entries(data)) {
    updateObj[`autopilot.${platform}.${key}`] = value as boolean | number | string[] | Date | null;
  }
  return UserModel.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: updateObj },
    { new: true, runValidators: true }
  ).exec();
}

export function updateUserAiConfig(
  id: string,
  aiConfigData: Record<string, unknown>
): Promise<UserDocument | null> {
  const updateObj: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(aiConfigData)) {
    updateObj[`aiConfig.${key}`] = value;
  }
  return UserModel.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: updateObj },
    { new: true, runValidators: true }
  ).exec();
}

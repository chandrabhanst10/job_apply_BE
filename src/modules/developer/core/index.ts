import { ApiKeyModel, type IApiKey } from "../apiKey.model.js";

export async function createApiKeyRecord(data: {
  userId: string;
  name: string;
  prefix: string;
  keyHash: string;
  scopes?: string[];
  expiresAt?: Date | null;
}): Promise<IApiKey> {
  return ApiKeyModel.create(data);
}

export async function listApiKeysByUserId(userId: string): Promise<IApiKey[]> {
  return ApiKeyModel.find({ userId, isRevoked: false }).sort({ createdAt: -1 }).exec();
}

export async function revokeApiKeyRecord(userId: string, keyId: string): Promise<IApiKey | null> {
  return ApiKeyModel.findOneAndUpdate(
    { _id: keyId, userId },
    { $set: { isRevoked: true } },
    { new: true }
  ).exec();
}

export async function findApiKeyByHash(keyHash: string): Promise<IApiKey | null> {
  return ApiKeyModel.findOne({ keyHash, isRevoked: false }).exec();
}

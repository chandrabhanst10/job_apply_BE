import crypto from "node:crypto";
import { createApiKeyRecord, listApiKeysByUserId, revokeApiKeyRecord } from "./core/index.js";
import type { CreateApiKeyPayload, ApiKeyCreatedResponse, ApiKeySummary } from "./types.js";

function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export class DeveloperService {
  async generateApiKey(userId: string, payload: CreateApiKeyPayload): Promise<ApiKeyCreatedResponse> {
    const randomBytes = crypto.randomBytes(24).toString("hex");
    const rawKey = `ak_live_${randomBytes}`;
    const prefix = rawKey.substring(0, 12);
    const keyHash = hashApiKey(rawKey);

    let expiresAt: Date | null = null;
    if (payload.expiresInDays && payload.expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + payload.expiresInDays);
    }

    const doc = await createApiKeyRecord({
      userId,
      name: payload.name,
      prefix,
      keyHash,
      scopes: payload.scopes || ["read", "write"],
      expiresAt
    });

    return {
      _id: (doc as { _id?: { toString(): string } })._id?.toString() || "",
      name: doc.name,
      key: rawKey,
      prefix: doc.prefix,
      scopes: doc.scopes || ["read", "write"],
      expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString()
    };
  }

  async getApiKeys(userId: string): Promise<ApiKeySummary[]> {
    const docs = await listApiKeysByUserId(userId);
    return docs.map(d => ({
      _id: (d as { _id?: { toString(): string } })._id?.toString() || "",
      name: d.name,
      prefix: d.prefix,
      scopes: d.scopes || ["read", "write"],
      lastUsedAt: d.lastUsedAt ? d.lastUsedAt.toISOString() : null,
      expiresAt: d.expiresAt ? d.expiresAt.toISOString() : null,
      createdAt: d.createdAt ? d.createdAt.toISOString() : new Date().toISOString()
    }));
  }

  async revokeApiKey(userId: string, keyId: string) {
    const revoked = await revokeApiKeyRecord(userId, keyId);
    if (!revoked) throw new Error("API key not found or already revoked");
    return { success: true, keyId };
  }
}

export const developerService = new DeveloperService();

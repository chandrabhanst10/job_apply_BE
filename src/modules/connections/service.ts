import { encryptText, decryptText } from "../../utils/crypto.js";
import { env } from "../../config/env.js";
import { NotFoundError, BadRequestError } from "../../utils/app-error.js";
import { auditService } from "../audit/service.js";
import { findUserById } from "../user/core/view.js";
import { updateAccountConnection } from "./core/index.js";

export interface CookieObject {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Lax" | "None" | "Strict";
}

export class ConnectionService {
  async linkAccount(
    userId: string,
    platform: "linkedin" | "naukri",
    input: { username: string; cookiesJson: string },
    context: { ip?: string; userAgent?: string }
  ) {
    const user = await findUserById(userId);
    if (!user) throw new NotFoundError("User not found");

    try {
      const parsed = JSON.parse(input.cookiesJson);
      if (!Array.isArray(parsed)) {
        throw new Error("Cookies must be a JSON array");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid cookies JSON format";
      throw new BadRequestError(`Invalid cookies format: ${msg}`);
    }

    const encryptedCookies = encryptText(input.cookiesJson, env.ENCRYPTION_KEY);

    const updatedUser = await updateAccountConnection(userId, platform, {
      isConnected: true,
      cookies: encryptedCookies,
      username: input.username,
      lastSyncAt: new Date()
    });

    if (!updatedUser) throw new NotFoundError("User not found");

    await auditService.record({
      userId,
      action: `connection.${platform}.link`,
      resource: "user",
      resourceId: userId,
      ...context
    });

    return {
      platform,
      isConnected: true,
      username: input.username,
      lastSyncAt: new Date()
    };
  }

  async saveEncryptedCookies(
    userId: string,
    platform: "linkedin" | "naukri" | "indeed",
    rawCookiesJson: string
  ) {
    const targetPlatform = platform === "indeed" ? "linkedin" : platform;
    const encryptedCookies = encryptText(rawCookiesJson, env.ENCRYPTION_KEY);
    await updateAccountConnection(userId, targetPlatform, {
      isConnected: true,
      cookies: encryptedCookies,
      lastSyncAt: new Date()
    });
  }

  async unlinkAccount(
    userId: string,
    platform: "linkedin" | "naukri",
    context: { ip?: string; userAgent?: string }
  ) {
    const user = await findUserById(userId);
    if (!user) throw new NotFoundError("User not found");

    const updatedUser = await updateAccountConnection(userId, platform, {
      isConnected: false,
      cookies: null,
      username: null,
      lastSyncAt: null
    });

    if (!updatedUser) throw new NotFoundError("User not found");

    await auditService.record({
      userId,
      action: `connection.${platform}.unlink`,
      resource: "user",
      resourceId: userId,
      ...context
    });

    return {
      platform,
      isConnected: false,
      username: null,
      lastSyncAt: null
    };
  }

  async getDecryptedCookies(userId: string, platform: "linkedin" | "naukri"): Promise<CookieObject[]> {
    const user = await findUserById(userId);
    if (!user) throw new NotFoundError("User not found");

    const connection = user.connections?.[platform];
    if (!connection || !connection.isConnected || !connection.cookies) {
      throw new BadRequestError(`Account not connected for ${platform}`);
    }

    try {
      const decrypted = decryptText(connection.cookies, env.ENCRYPTION_KEY);
      return JSON.parse(decrypted) as CookieObject[];
    } catch {
      throw new Error("Failed to decrypt account session cookies");
    }
  }

  async getConnectionStatus(userId: string) {
    const user = await findUserById(userId);
    if (!user) throw new NotFoundError("User not found");

    return {
      linkedin: {
        isConnected: user.connections?.linkedin?.isConnected ?? false,
        username: user.connections?.linkedin?.username ?? null,
        lastSyncAt: user.connections?.linkedin?.lastSyncAt ?? null
      },
      naukri: {
        isConnected: user.connections?.naukri?.isConnected ?? false,
        username: user.connections?.naukri?.username ?? null,
        lastSyncAt: user.connections?.naukri?.lastSyncAt ?? null
      }
    };
  }

  async getStatus(userId: string) {
    return this.getConnectionStatus(userId);
  }
}

export const connectionService = new ConnectionService();
